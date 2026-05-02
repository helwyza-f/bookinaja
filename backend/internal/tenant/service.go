package tenant

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/auth"
	"github.com/helwiza/backend/internal/fnb"
	"github.com/helwiza/backend/internal/resource"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

const freeTrialDuration = 30 * 24 * time.Hour

type Service struct {
	repo        *Repository
	authService *auth.Service
}

func NewService(r *Repository, authService *auth.Service) *Service {
	return &Service{
		repo:        r,
		authService: authService,
	}
}

// GetPublicProfile Baru: Jalur cepat buat ambil tema & identitas (Granular)
func (s *Service) GetPublicProfile(ctx context.Context, slug string) (*Tenant, error) {
	// Repo ini harus sudah punya logic Cache-Aside Redis
	return s.repo.GetBySlug(ctx, slug)
}

// GetPublicLandingData mengambil full data (Profile + Resources)
func (s *Service) GetPublicLandingData(ctx context.Context, slug string) (map[string]interface{}, error) {
	return s.repo.GetPublicLandingData(ctx, slug)
}

func (s *Service) ListPublicTenants(ctx context.Context) ([]TenantDirectoryItem, error) {
	items, err := s.repo.ListPublicTenants(ctx)
	if err != nil {
		return nil, err
	}
	return s.decorateDiscoveryItems(items), nil
}

func (s *Service) GetPublicDiscoverFeed(ctx context.Context) (*PublicDiscoverFeedResponse, error) {
	items, err := s.ListPublicTenants(ctx)
	if err != nil {
		return nil, err
	}
	posts, postMetrics, err := s.loadActiveDiscoveryPosts(ctx)
	if err != nil {
		return nil, err
	}
	feedItems := s.buildUnifiedDiscoveryFeedItems(items, posts, postMetrics, nil)
	return s.buildPublicDiscoverFeed(feedItems, false), nil
}

func (s *Service) GetCustomerDiscoverFeed(ctx context.Context, customerID uuid.UUID) (*PublicDiscoverFeedResponse, error) {
	items, err := s.ListPublicTenants(ctx)
	if err != nil {
		return nil, err
	}

	signals, err := s.repo.GetCustomerDiscoverySignals(ctx, customerID)
	if err != nil {
		return nil, err
	}

	posts, postMetrics, err := s.loadActiveDiscoveryPosts(ctx)
	if err != nil {
		return nil, err
	}

	personalized := s.personalizeDiscoveryItems(items, signals)
	feedItems := s.buildUnifiedDiscoveryFeedItems(personalized, posts, postMetrics, signals)
	return s.buildCustomerDiscoverFeed(feedItems, signals), nil
}

func (s *Service) GetOwnerDiscoverFeed(ctx context.Context, tenantID uuid.UUID) (*PublicDiscoverFeedResponse, error) {
	items, err := s.ListPublicTenants(ctx)
	if err != nil {
		return nil, err
	}
	posts, postMetrics, err := s.loadActiveDiscoveryPosts(ctx)
	if err != nil {
		return nil, err
	}
	feedItems := s.buildUnifiedDiscoveryFeedItems(items, posts, postMetrics, nil)
	feed := s.buildPublicDiscoverFeed(feedItems, false)
	if feed == nil {
		return nil, nil
	}
	feed.Hero.Eyebrow = "Feed Bookinaja"
	feed.Hero.Title = "Lihat apa yang sedang tampil di Feed Bookinaja."
	feed.Hero.Description = "Gunakan tampilan ini untuk membaca kualitas visual, ritme promosi, dan posisi bisnis lain di feed yang sama dengan customer."

	if tenantID != uuid.Nil {
		for i, item := range feed.Featured {
			if item.TenantID == tenantID {
				feed.Featured[i].FeedReason = "Ini bisnis kamu di feed publik saat ini"
				break
			}
		}
	}

	return feed, nil
}

func (s *Service) GetPublicDiscoveryPostDetail(ctx context.Context, postID uuid.UUID) (*PublicDiscoveryPostDetailResponse, error) {
	if !s.discoveryPostsEnabled() {
		return nil, nil
	}

	post, err := s.repo.GetActiveDiscoveryPostByID(ctx, postID)
	if err != nil {
		return nil, err
	}
	if post == nil {
		return nil, nil
	}

	tenants, err := s.ListPublicTenants(ctx)
	if err != nil {
		return nil, err
	}
	var tenantItem *TenantDirectoryItem
	for i := range tenants {
		if tenants[i].ID == post.TenantID {
			tenantItem = &tenants[i]
			break
		}
	}
	if tenantItem == nil {
		return nil, nil
	}

	postMetrics, err := s.repo.GetDiscoveryPostMetrics(ctx, []uuid.UUID{post.ID})
	if err != nil {
		return nil, err
	}

	item := discoveryPostFeedItem(*tenantItem, *post)
	if metric, ok := postMetrics[post.ID]; ok {
		item.PostImpressions7d = metric.Impressions7d
		item.PostClicks7d = metric.Clicks7d
		item.PostCTR7d = metric.CTR7d
		item.PostDetailViews7d = metric.DetailViews7d
		item.PostTenantOpens7d = metric.TenantOpens7d
		item.PostRelatedClicks7d = metric.RelatedClicks7d
		item.PostRelatedTenantOpens7d = metric.RelatedTenantOpens7d
		item.PostBookingStarts7d = metric.BookingStarts7d
		item.PostLastInteractionAt = metric.LastInteractionAt
	}
	item.FeedScore = (discoveryRank(*tenantItem) / 2) + discoveryPostScore(*post, *tenantItem) + discoveryPostPerformanceScore(item)

	posts, relatedPostMetrics, err := s.loadActiveDiscoveryPosts(ctx)
	if err != nil {
		return nil, err
	}
	feedItems := s.buildUnifiedDiscoveryFeedItems(tenants, posts, relatedPostMetrics, nil)
	related := make([]DiscoveryFeedItem, 0, 4)
	for _, candidate := range feedItems {
		if candidate.ID == item.ID {
			continue
		}
		if candidate.TenantID == item.TenantID || candidate.BusinessCategory == item.BusinessCategory {
			related = append(related, candidate)
		}
		if len(related) >= 4 {
			break
		}
	}

	return &PublicDiscoveryPostDetailResponse{
		Item:    item,
		Tenant:  *tenantItem,
		Related: related,
	}, nil
}

func (s *Service) discoveryPostsEnabled() bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv("BOOKINAJA_ENABLE_DISCOVERY_POSTS")))
	return value == "1" || value == "true" || value == "yes" || value == "on"
}

func (s *Service) loadActiveDiscoveryPosts(ctx context.Context) ([]TenantPost, map[uuid.UUID]TenantPostMetric, error) {
	if !s.discoveryPostsEnabled() {
		return nil, map[uuid.UUID]TenantPostMetric{}, nil
	}

	posts, err := s.repo.ListActiveDiscoveryPosts(ctx)
	if err != nil {
		return nil, nil, err
	}
	postIDs := make([]uuid.UUID, 0, len(posts))
	for _, post := range posts {
		postIDs = append(postIDs, post.ID)
	}
	postMetrics, err := s.repo.GetDiscoveryPostMetrics(ctx, postIDs)
	if err != nil {
		return nil, nil, err
	}
	return posts, postMetrics, nil
}

func (s *Service) ListTenantPosts(ctx context.Context, tenantID uuid.UUID) ([]TenantPost, error) {
	posts, err := s.repo.ListTenantPosts(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	postIDs := make([]uuid.UUID, 0, len(posts))
	for _, post := range posts {
		postIDs = append(postIDs, post.ID)
	}
	postMetrics, err := s.repo.GetDiscoveryPostMetrics(ctx, postIDs)
	if err != nil {
		return nil, err
	}
	for i := range posts {
		metadata := parseTenantPostMediaMetadata(posts[i].Metadata)
		normalized, _ := normalizeTenantPostMetadata(
			posts[i].Metadata,
			posts[i].Type,
			posts[i].CoverMediaURL,
			posts[i].ThumbnailURL,
		)
		posts[i].Metadata = normalized
		if metric, ok := postMetrics[posts[i].ID]; ok {
			posts[i].Impressions7d = metric.Impressions7d
			posts[i].Clicks7d = metric.Clicks7d
			posts[i].CTR7d = metric.CTR7d
			posts[i].DetailViews7d = metric.DetailViews7d
			posts[i].TenantOpens7d = metric.TenantOpens7d
			posts[i].RelatedClicks7d = metric.RelatedClicks7d
			posts[i].RelatedTenantOpens7d = metric.RelatedTenantOpens7d
			posts[i].BookingStarts7d = metric.BookingStarts7d
			posts[i].LastInteractionAt = metric.LastInteractionAt
		}
		if len(posts[i].Metadata) == 0 {
			posts[i].Metadata, _ = json.Marshal(metadata)
		}
	}
	return posts, nil
}

func (s *Service) CreateTenantPost(ctx context.Context, actorUserID, tenantID uuid.UUID, req TenantPostUpsertReq) (*TenantPost, error) {
	post, err := normalizeTenantPostReq(req)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	post.ID = uuid.New()
	post.TenantID = tenantID
	post.AuthorUserID = &actorUserID
	post.CreatedAt = now
	post.UpdatedAt = now
	post.PublishedAt = derivePublishedAt(post.Status, now)

	created, err := s.repo.CreateTenantPost(ctx, post)
	if err != nil {
		return nil, err
	}

	metadata, _ := json.Marshal(map[string]any{
		"title":  created.Title,
		"type":   created.Type,
		"status": created.Status,
	})
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     tenantID,
		ActorUserID:  &actorUserID,
		Action:       "create_tenant_post",
		ResourceType: "tenant_post",
		ResourceID:   &created.ID,
		Metadata:     metadata,
		CreatedAt:    now,
	})

	return created, nil
}

func (s *Service) UpdateTenantPost(ctx context.Context, actorUserID, tenantID, postID uuid.UUID, req TenantPostUpsertReq) (*TenantPost, error) {
	current, err := s.repo.GetTenantPostByID(ctx, tenantID, postID)
	if err != nil {
		return nil, err
	}
	if current == nil {
		return nil, errors.New("postingan tidak ditemukan")
	}

	next, err := normalizeTenantPostReq(req)
	if err != nil {
		return nil, err
	}
	next.ID = current.ID
	next.TenantID = current.TenantID
	next.AuthorUserID = current.AuthorUserID
	next.CreatedAt = current.CreatedAt
	next.UpdatedAt = time.Now().UTC()
	if current.PublishedAt != nil && current.Status == "published" && next.Status == "published" {
		next.PublishedAt = current.PublishedAt
	} else {
		next.PublishedAt = derivePublishedAt(next.Status, next.UpdatedAt)
	}

	updated, err := s.repo.UpdateTenantPost(ctx, next)
	if err != nil {
		return nil, err
	}

	metadata, _ := json.Marshal(map[string]any{
		"title":  updated.Title,
		"type":   updated.Type,
		"status": updated.Status,
	})
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     tenantID,
		ActorUserID:  &actorUserID,
		Action:       "update_tenant_post",
		ResourceType: "tenant_post",
		ResourceID:   &updated.ID,
		Metadata:     metadata,
		CreatedAt:    updated.UpdatedAt,
	})

	return updated, nil
}

func (s *Service) DeleteTenantPost(ctx context.Context, actorUserID, tenantID, postID uuid.UUID) error {
	current, err := s.repo.GetTenantPostByID(ctx, tenantID, postID)
	if err != nil {
		return err
	}
	if current == nil {
		return errors.New("postingan tidak ditemukan")
	}
	if err := s.repo.DeleteTenantPost(ctx, tenantID, postID); err != nil {
		return err
	}

	metadata, _ := json.Marshal(map[string]any{
		"title":  current.Title,
		"type":   current.Type,
		"status": current.Status,
	})
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     tenantID,
		ActorUserID:  &actorUserID,
		Action:       "delete_tenant_post",
		ResourceType: "tenant_post",
		ResourceID:   &postID,
		Metadata:     metadata,
		CreatedAt:    time.Now().UTC(),
	})

	return nil
}

func (s *Service) buildPublicDiscoverFeed(items []DiscoveryFeedItem, personalized bool) *PublicDiscoverFeedResponse {
	quickCategories := buildQuickCategories(items)
	hasPosts := hasPostFeedItems(items)
	selection := newFeedSelectionState()
	featured := pickFeedSectionItems(items, feedSectionConfig{
		Limit:                4,
		GlobalTenantCap:      1,
		AllowFallbackReuse:   false,
		RequirePositiveScore: true,
		Score:                scoreFeaturedSectionItem,
	}, selection)
	trending := pickFeedSectionItems(items, feedSectionConfig{
		Limit:                6,
		GlobalTenantCap:      2,
		AllowFallbackReuse:   true,
		RequirePositiveScore: true,
		Predicate: func(item DiscoveryFeedItem) bool {
			return item.DiscoveryClicks30d > 0 || item.PostClicks7d > 0 || item.ItemKind == "post"
		},
		Score: scoreTrendingSectionItem,
	}, selection)
	valuePicks := pickFeedSectionItems(items, feedSectionConfig{
		Limit:                6,
		GlobalTenantCap:      2,
		AllowFallbackReuse:   true,
		RequirePositiveScore: true,
		Predicate: func(item DiscoveryFeedItem) bool {
			return item.StartingPrice > 0
		},
		Score: scoreValueSectionItem,
	}, selection)
	freshFinds := pickFeedSectionItems(items, feedSectionConfig{
		Limit:                6,
		GlobalTenantCap:      2,
		AllowFallbackReuse:   true,
		RequirePositiveScore: true,
		Predicate: func(item DiscoveryFeedItem) bool {
			return item.IsNew || isRecentPost(item, 21*24*time.Hour)
		},
		Score: scoreFreshSectionItem,
	}, selection)
	lateNight := pickFeedSectionItems(items, feedSectionConfig{
		Limit:                6,
		GlobalTenantCap:      2,
		AllowFallbackReuse:   true,
		RequirePositiveScore: true,
		Predicate: func(item DiscoveryFeedItem) bool {
			return closesLate(item.CloseTime)
		},
		Score: scoreLateNightSectionItem,
	}, selection)

	return &PublicDiscoverFeedResponse{
		Hero: PublicDiscoveryHero{
			Eyebrow:     "Feed Bookinaja",
			Title:       sectionDescription(hasPosts, "Temukan tempat, aktivitas, dan konten yang layak dicoba duluan.", "Temukan tempat dan aktivitas yang layak dicoba duluan."),
			Description: publicFeedHeroDescription(hasPosts),
			SearchHint:  "Cari tempat, kategori, aktivitas, atau suasana yang kamu cari",
		},
		QuickCategories: quickCategories,
		Featured:        featured,
		Personalized:    personalized,
		Sections: []PublicDiscoverySection{
			{
				ID:          "trending-now",
				Title:       "Sedang Banyak Dilirik",
				Description: sectionDescription(hasPosts, "Campuran bisnis dan postingan yang sedang paling aktif menarik perhatian di Feed Bookinaja.", "Bisnis yang sedang paling aktif menarik perhatian di Feed Bookinaja."),
				Style:       "trending",
				Items:       trending,
			},
			{
				ID:          "value-picks",
				Title:       "Mudah Dicoba Duluan",
				Description: "Pilihan dengan titik masuk yang lebih ringan, cocok untuk customer yang ingin mulai dari yang paling mudah dicoba.",
				Style:       "value",
				Items:       valuePicks,
			},
			{
				ID:          "fresh-finds",
				Title:       "Baru Naik di Feed",
				Description: sectionDescription(hasPosts, "Listing baru dan postingan baru yang layak dijelajahi lebih awal.", "Listing baru yang layak dijelajahi lebih awal."),
				Style:       "fresh",
				Items:       freshFinds,
			},
			{
				ID:          "late-night",
				Title:       "Cocok untuk Sore Sampai Malam",
				Description: "Bisnis yang lebih relevan untuk customer dengan preferensi slot sore hingga malam.",
				Style:       "night",
				Items:       lateNight,
			},
		},
	}
}

func (s *Service) buildCustomerDiscoverFeed(items []DiscoveryFeedItem, signals *CustomerDiscoverySignals) *PublicDiscoverFeedResponse {
	quickCategories := buildQuickCategories(items)
	hasPosts := hasPostFeedItems(items)

	title := "Temukan sesuatu yang lebih nyambung buat kamu."
	description := customerFeedHeroDescription(hasPosts)
	if signals == nil || signals.TotalBookings == 0 {
		title = "Mulai dari yang paling siap dijelajahi."
		description = sectionDescription(hasPosts, "Saat jejak booking kamu masih sedikit, Bookinaja memulai dari bisnis dan postingan yang paling rapi, paling menarik, dan paling mudah dicoba.", "Saat jejak booking kamu masih sedikit, Bookinaja memulai dari bisnis yang paling rapi, paling menarik, dan paling mudah dicoba.")
	}

	selection := newFeedSelectionState()
	featured := pickFeedSectionItems(items, feedSectionConfig{
		Limit:                4,
		GlobalTenantCap:      1,
		AllowFallbackReuse:   false,
		RequirePositiveScore: true,
		Score: func(item DiscoveryFeedItem) int {
			return scoreForYouSectionItem(item, signals) + scoreFeaturedSectionItem(item)/2
		},
	}, selection)
	preference := pickFeedSectionItems(items, feedSectionConfig{
		Limit:                6,
		GlobalTenantCap:      2,
		AllowFallbackReuse:   true,
		RequirePositiveScore: true,
		Predicate: func(item DiscoveryFeedItem) bool {
			return strings.TrimSpace(item.FeedReason) != ""
		},
		Score: func(item DiscoveryFeedItem) int {
			return scoreForYouSectionItem(item, signals)
		},
	}, selection)
	rebook := pickFeedSectionItems(items, feedSectionConfig{
		Limit:                6,
		GlobalTenantCap:      2,
		AllowFallbackReuse:   true,
		RequirePositiveScore: true,
		Predicate: func(item DiscoveryFeedItem) bool {
			return signals != nil && signals.VisitedTenants[item.TenantID] > 0
		},
		Score: func(item DiscoveryFeedItem) int {
			return scoreRepeatSectionItem(item, signals)
		},
	}, selection)
	fresh := pickFeedSectionItems(items, feedSectionConfig{
		Limit:                6,
		GlobalTenantCap:      2,
		AllowFallbackReuse:   true,
		RequirePositiveScore: true,
		Predicate: func(item DiscoveryFeedItem) bool {
			return item.IsNew || item.ItemKind == "post"
		},
		Score: func(item DiscoveryFeedItem) int {
			return scoreFreshCustomerSectionItem(item, signals)
		},
	}, selection)
	budgetFit := pickFeedSectionItems(items, feedSectionConfig{
		Limit:                6,
		GlobalTenantCap:      2,
		AllowFallbackReuse:   true,
		RequirePositiveScore: true,
		Predicate: func(item DiscoveryFeedItem) bool {
			return signals != nil && signals.AverageSpend > 0 && item.StartingPrice > 0
		},
		Score: func(item DiscoveryFeedItem) int {
			return scoreBudgetSectionItem(item, signals)
		},
	}, selection)

	return &PublicDiscoverFeedResponse{
		Hero: PublicDiscoveryHero{
			Eyebrow:     "Feed Personal",
			Title:       title,
			Description: description,
			SearchHint:  "Cari tempat, kategori, aktivitas, atau suasana yang kamu cari",
		},
		QuickCategories: quickCategories,
		Featured:        featured,
		Personalized:    true,
		Sections: []PublicDiscoverySection{
			{
				ID:          "for-you",
				Title:       "Paling Nyambung Buat Kamu",
				Description: sectionDescription(hasPosts, "Dipilih dari kategori yang sering kamu pilih, tenant yang pernah kamu kunjungi, dan postingan yang paling relevan dari bisnis itu.", "Dipilih dari kategori yang sering kamu pilih dan tenant yang pernah kamu kunjungi."),
				Style:       "personal",
				Items:       preference,
			},
			{
				ID:          "rebook-favorites",
				Title:       "Bisnis yang Pernah Kamu Pilih",
				Description: sectionDescription(hasPosts, "Cocok untuk repeat booking yang lebih cepat, lengkap dengan postingan terbaru dari bisnis yang sudah kamu kenal.", "Cocok untuk repeat booking yang lebih cepat dari bisnis yang sudah kamu kenal."),
				Style:       "repeat",
				Items:       rebook,
			},
			{
				ID:          "fresh-for-you",
				Title:       "Konten Baru yang Masih Relevan",
				Description: sectionDescription(hasPosts, "Bisnis baru dan postingan baru yang tetap terasa dekat dengan minat dan pola booking kamu.", "Bisnis baru yang tetap terasa dekat dengan minat dan pola booking kamu."),
				Style:       "fresh",
				Items:       fresh,
			},
			{
				ID:          "budget-fit",
				Title:       "Masih Masuk Pola Budget Kamu",
				Description: "Pilihan dengan titik masuk yang lebih dekat ke kebiasaan booking kamu sejauh ini.",
				Style:       "budget",
				Items:       budgetFit,
			},
		},
	}
}

func (s *Service) TrackDiscoveryEvent(ctx context.Context, req DiscoveryEventReq) error {
	eventType := strings.ToLower(strings.TrimSpace(req.EventType))
	switch eventType {
	case "impression", "click", "detail_view", "tenant_open", "booking_start", "related_click", "tenant_profile_open_from_related":
	default:
		return errors.New("event_type tidak valid")
	}

	var tenantRef *Tenant
	var err error
	if rawID := strings.TrimSpace(req.TenantID); rawID != "" {
		tenantUUID, parseErr := uuid.Parse(rawID)
		if parseErr != nil {
			return errors.New("tenant_id tidak valid")
		}
		tenantRef, err = s.repo.GetByID(ctx, tenantUUID)
		if err != nil {
			return err
		}
	} else if slug := strings.TrimSpace(strings.ToLower(req.TenantSlug)); slug != "" {
		tenantRef, err = s.repo.GetBySlug(ctx, slug)
		if err != nil {
			return err
		}
	} else {
		return errors.New("tenant diperlukan")
	}

	if tenantRef == nil {
		return errors.New("tenant tidak ditemukan")
	}

	metadata := req.Metadata
	if len(metadata) == 0 {
		metadata = json.RawMessage(`{}`)
	}

	return s.repo.CreateDiscoveryFeedEvent(ctx, DiscoveryFeedEvent{
		ID:            uuid.New(),
		TenantID:      tenantRef.ID,
		EventType:     eventType,
		Surface:       firstNonEmpty(req.Surface, "discover"),
		SectionID:     strings.TrimSpace(req.SectionID),
		CardVariant:   strings.TrimSpace(req.CardVariant),
		PositionIndex: req.PositionIndex,
		SessionID:     strings.TrimSpace(req.SessionID),
		PromoLabel:    strings.TrimSpace(req.PromoLabel),
		Metadata:      metadata,
		CreatedAt:     time.Now().UTC(),
	})
}

func (s *Service) decorateDiscoveryItems(items []TenantDirectoryItem) []TenantDirectoryItem {
	decorated := make([]TenantDirectoryItem, 0, len(items))
	now := time.Now()

	for _, item := range items {
		entry := item
		promoActive := promoWindowActive(item.PromoStartsAt, item.PromoEndsAt, now)
		entry.DiscoveryHeadline = firstNonEmpty(item.DiscoveryHeadline, buildDiscoveryHeadline(item))
		entry.DiscoverySubheadline = firstNonEmpty(item.DiscoverySubheadline, buildDiscoverySubheadline(item))
		entry.DiscoveryTags = firstStringSlice(item.DiscoveryTags, buildDiscoveryTags(item))
		entry.DiscoveryBadges = firstStringSlice(item.DiscoveryBadges, buildDiscoveryBadges(item))
		entry.IsNew = now.Sub(item.CreatedAt) <= 45*24*time.Hour
		entry.IsPromoted = (item.DiscoveryPromoted && promoActive) || shouldAutoPromote(item)
		entry.IsFeatured = item.DiscoveryFeatured || shouldAutoFeature(item, entry)
		entry.PromoLabel = firstNonEmpty(curatedPromoLabel(item, promoActive), buildPromoLabel(item, entry))
		entry.FeaturedReason = firstNonEmpty(item.HighlightCopy, buildFeaturedReason(item, entry))
		entry.AvailabilityHint = buildAvailabilityHint(item)
		decorated = append(decorated, entry)
	}

	sort.SliceStable(decorated, func(i, j int) bool {
		left := discoveryRank(decorated[i])
		right := discoveryRank(decorated[j])
		if left != right {
			return left > right
		}
		if decorated[i].DiscoveryPriority != decorated[j].DiscoveryPriority {
			return decorated[i].DiscoveryPriority > decorated[j].DiscoveryPriority
		}
		if !decorated[i].CreatedAt.Equal(decorated[j].CreatedAt) {
			return decorated[i].CreatedAt.After(decorated[j].CreatedAt)
		}
		return strings.ToLower(decorated[i].Name) < strings.ToLower(decorated[j].Name)
	})

	return decorated
}

func (s *Service) personalizeDiscoveryItems(items []TenantDirectoryItem, signals *CustomerDiscoverySignals) []TenantDirectoryItem {
	if signals == nil {
		return items
	}

	personalized := make([]TenantDirectoryItem, 0, len(items))
	for _, item := range items {
		entry := item
		entry.PersonalizationScore, entry.RecommendationReason = scorePersonalization(item, signals)
		personalized = append(personalized, entry)
	}

	sort.SliceStable(personalized, func(i, j int) bool {
		left := discoveryRank(personalized[i]) + personalized[i].PersonalizationScore
		right := discoveryRank(personalized[j]) + personalized[j].PersonalizationScore
		if left != right {
			return left > right
		}
		if personalized[i].DiscoveryCtr30d != personalized[j].DiscoveryCtr30d {
			return personalized[i].DiscoveryCtr30d > personalized[j].DiscoveryCtr30d
		}
		return personalized[i].CreatedAt.After(personalized[j].CreatedAt)
	})

	return personalized
}

func (s *Service) buildUnifiedDiscoveryFeedItems(
	tenants []TenantDirectoryItem,
	posts []TenantPost,
	postMetrics map[uuid.UUID]TenantPostMetric,
	signals *CustomerDiscoverySignals,
) []DiscoveryFeedItem {
	tenantByID := make(map[uuid.UUID]TenantDirectoryItem, len(tenants))
	items := make([]DiscoveryFeedItem, 0, len(tenants)+len(posts))

	for _, tenantItem := range tenants {
		tenantByID[tenantItem.ID] = tenantItem
		feedItem := discoveryTenantFeedItem(tenantItem)
		if signals != nil {
			feedItem.PersonalizationScore = tenantItem.PersonalizationScore
			if strings.TrimSpace(tenantItem.RecommendationReason) != "" {
				feedItem.FeedReason = tenantItem.RecommendationReason
			}
		}
		feedItem.FeedScore = discoveryRank(tenantItem) + feedItem.PersonalizationScore
		items = append(items, feedItem)
	}

	for _, post := range posts {
		tenantItem, exists := tenantByID[post.TenantID]
		if !exists {
			continue
		}
		feedItem := discoveryPostFeedItem(tenantItem, post)
		if metric, ok := postMetrics[post.ID]; ok {
			feedItem.PostImpressions7d = metric.Impressions7d
			feedItem.PostClicks7d = metric.Clicks7d
			feedItem.PostCTR7d = metric.CTR7d
			feedItem.PostDetailViews7d = metric.DetailViews7d
			feedItem.PostTenantOpens7d = metric.TenantOpens7d
			feedItem.PostRelatedClicks7d = metric.RelatedClicks7d
			feedItem.PostRelatedTenantOpens7d = metric.RelatedTenantOpens7d
			feedItem.PostBookingStarts7d = metric.BookingStarts7d
			feedItem.PostLastInteractionAt = metric.LastInteractionAt
		}
		if signals != nil {
			feedItem.PersonalizationScore = tenantItem.PersonalizationScore
			if strings.TrimSpace(tenantItem.RecommendationReason) != "" {
				feedItem.FeedReason = tenantItem.RecommendationReason
			}
		}
		feedItem.FeedScore = (discoveryRank(tenantItem) / 2) +
			discoveryPostScore(post, tenantItem) +
			discoveryPostPerformanceScore(feedItem) +
			feedItem.PersonalizationScore
		items = append(items, feedItem)
	}

	sort.SliceStable(items, func(i, j int) bool {
		if items[i].FeedScore != items[j].FeedScore {
			return items[i].FeedScore > items[j].FeedScore
		}
		leftTime := discoveryFeedItemSortTime(items[i])
		rightTime := discoveryFeedItemSortTime(items[j])
		if !leftTime.Equal(rightTime) {
			return leftTime.After(rightTime)
		}
		if items[i].ItemKind != items[j].ItemKind {
			return items[i].ItemKind == "post"
		}
		return strings.ToLower(items[i].FeedTitle) < strings.ToLower(items[j].FeedTitle)
	})

	return items
}

func buildQuickCategories(items []DiscoveryFeedItem) []string {
	categoriesSet := map[string]struct{}{}
	for _, item := range items {
		category := strings.TrimSpace(item.BusinessCategory)
		if category == "" {
			continue
		}
		categoriesSet[category] = struct{}{}
	}

	quickCategories := make([]string, 0, len(categoriesSet))
	for category := range categoriesSet {
		quickCategories = append(quickCategories, category)
	}
	sort.Strings(quickCategories)
	if len(quickCategories) > 6 {
		quickCategories = quickCategories[:6]
	}
	return quickCategories
}

type feedSelectionState struct {
	usedItemIDs       map[string]struct{}
	tenantAppearances map[uuid.UUID]int
}

type feedSectionConfig struct {
	Limit                int
	GlobalTenantCap      int
	AllowFallbackReuse   bool
	RequirePositiveScore bool
	Predicate            func(DiscoveryFeedItem) bool
	Score                func(DiscoveryFeedItem) int
}

func newFeedSelectionState() *feedSelectionState {
	return &feedSelectionState{
		usedItemIDs:       map[string]struct{}{},
		tenantAppearances: map[uuid.UUID]int{},
	}
}

func pickFeedSectionItems(items []DiscoveryFeedItem, cfg feedSectionConfig, state *feedSelectionState) []DiscoveryFeedItem {
	if cfg.Limit <= 0 || len(items) == 0 {
		return []DiscoveryFeedItem{}
	}
	ranked := rankSectionCandidates(items, cfg)
	selected := make([]DiscoveryFeedItem, 0, cfg.Limit)
	selectedIDs := map[string]struct{}{}
	selectedTenants := map[uuid.UUID]struct{}{}

	tryAppend := func(item DiscoveryFeedItem, allowReuse bool, ignoreGlobalCap bool) bool {
		if cfg.Predicate != nil && !cfg.Predicate(item) {
			return false
		}
		score := 0
		if cfg.Score != nil {
			score = cfg.Score(item)
		}
		if cfg.RequirePositiveScore && score <= 0 {
			return false
		}
		if _, exists := selectedIDs[item.ID]; exists {
			return false
		}
		if _, exists := selectedTenants[item.TenantID]; exists {
			return false
		}
		if !allowReuse {
			if _, exists := state.usedItemIDs[item.ID]; exists {
				return false
			}
		}
		if !ignoreGlobalCap && cfg.GlobalTenantCap > 0 && state.tenantAppearances[item.TenantID] >= cfg.GlobalTenantCap {
			return false
		}

		selected = append(selected, item)
		selectedIDs[item.ID] = struct{}{}
		selectedTenants[item.TenantID] = struct{}{}
		return len(selected) >= cfg.Limit
	}

	for _, item := range ranked {
		if tryAppend(item, false, false) {
			break
		}
	}
	if len(selected) < cfg.Limit {
		for _, item := range ranked {
			if tryAppend(item, false, true) {
				break
			}
		}
	}
	if cfg.AllowFallbackReuse && len(selected) < cfg.Limit {
		for _, item := range ranked {
			if tryAppend(item, true, true) {
				break
			}
		}
	}

	for _, item := range selected {
		state.usedItemIDs[item.ID] = struct{}{}
		state.tenantAppearances[item.TenantID]++
	}

	return selected
}

func rankSectionCandidates(items []DiscoveryFeedItem, cfg feedSectionConfig) []DiscoveryFeedItem {
	ranked := make([]DiscoveryFeedItem, 0, len(items))
	for _, item := range items {
		if cfg.Predicate != nil && !cfg.Predicate(item) {
			continue
		}
		ranked = append(ranked, item)
	}
	sort.SliceStable(ranked, func(i, j int) bool {
		left := cfg.Score(ranked[i])
		right := cfg.Score(ranked[j])
		if left != right {
			return left > right
		}
		if ranked[i].FeedScore != ranked[j].FeedScore {
			return ranked[i].FeedScore > ranked[j].FeedScore
		}
		leftTime := discoveryFeedItemSortTime(ranked[i])
		rightTime := discoveryFeedItemSortTime(ranked[j])
		if !leftTime.Equal(rightTime) {
			return leftTime.After(rightTime)
		}
		if ranked[i].ItemKind != ranked[j].ItemKind {
			return ranked[i].ItemKind == "post"
		}
		return strings.ToLower(ranked[i].FeedTitle) < strings.ToLower(ranked[j].FeedTitle)
	})
	return ranked
}

func discoveryTenantFeedItem(item TenantDirectoryItem) DiscoveryFeedItem {
	return DiscoveryFeedItem{
		ID:                   item.ID.String(),
		ItemKind:             "tenant",
		TenantID:             item.ID,
		TenantDirectoryItem:  item,
		FeedTitle:            firstNonEmpty(item.DiscoveryHeadline, item.Name),
		FeedSummary:          firstNonEmpty(item.HighlightCopy, item.DiscoverySubheadline, item.Tagline, item.AboutUs),
		FeedImageURL:         firstNonEmpty(item.FeaturedImageURL, item.BannerURL, item.LogoURL),
		FeedLabel:            firstNonEmpty(item.PromoLabel, prettifyLabel(item.BusinessCategory), "Feed Bookinaja"),
		FeedReason:           firstNonEmpty(item.RecommendationReason, item.FeaturedReason, item.AvailabilityHint),
		FeedTags:             cloneStringSlice(item.DiscoveryTags),
		FeedBadges:           cloneStringSlice(item.DiscoveryBadges),
		FeedCTA:              "Lihat bisnis",
		FeedScore:            discoveryRank(item),
		PersonalizationScore: item.PersonalizationScore,
	}
}

func discoveryPostFeedItem(tenantItem TenantDirectoryItem, post TenantPost) DiscoveryFeedItem {
	postTitle := strings.TrimSpace(post.Title)
	postCaption := strings.TrimSpace(post.Caption)
	postLabel := strings.TrimSpace(post.CTA)
	if postLabel == "" {
		postLabel = firstNonEmpty(tenantItem.PromoLabel, labelForPostType(post.Type))
	}
	mediaMeta := parseTenantPostMediaMetadata(post.Metadata)

	return DiscoveryFeedItem{
		ID:                   post.ID.String(),
		ItemKind:             "post",
		TenantID:             tenantItem.ID,
		TenantDirectoryItem:  tenantItem,
		FeedTitle:            firstNonEmpty(postTitle, tenantItem.DiscoveryHeadline, tenantItem.Name),
		FeedSummary:          firstNonEmpty(postCaption, tenantItem.HighlightCopy, tenantItem.DiscoverySubheadline),
		FeedImageURL:         firstNonEmpty(post.CoverMediaURL, post.ThumbnailURL, tenantItem.FeaturedImageURL, tenantItem.BannerURL, tenantItem.LogoURL),
		FeedLabel:            firstNonEmpty(postLabel, labelForPostType(post.Type), "Postingan baru"),
		FeedReason:           firstNonEmpty(tenantItem.RecommendationReason, tenantItem.AvailabilityHint, "Postingan terbaru dari bisnis ini"),
		FeedTags:             cloneStringSlice(tenantItem.DiscoveryTags),
		FeedBadges:           appendUniqueStrings(cloneStringSlice(tenantItem.DiscoveryBadges), labelForPostType(post.Type)),
		FeedCTA:              firstNonEmpty(post.CTA, "Lihat bisnis"),
		PostID:               &post.ID,
		PostType:             post.Type,
		PostStatus:           post.Status,
		PostVisibility:       post.Visibility,
		PostCaption:          post.Caption,
		PostCoverMediaURL:    post.CoverMediaURL,
		PostThumbnailURL:     post.ThumbnailURL,
		PostPosterURL:        firstNonEmpty(mediaMeta.PosterURL, post.ThumbnailURL),
		PostMimeType:         mediaMeta.MIMEType,
		PostStreamURLHLS:     mediaMeta.StreamURLHLS,
		PostDurationSeconds:  mediaMeta.DurationSeconds,
		PostWidth:            mediaMeta.Width,
		PostHeight:           mediaMeta.Height,
		PostPublishedAt:      post.PublishedAt,
		PersonalizationScore: tenantItem.PersonalizationScore,
	}
}

func discoveryPostScore(post TenantPost, tenantItem TenantDirectoryItem) int {
	score := 20
	meta := parseTenantPostMediaMetadata(post.Metadata)
	if strings.TrimSpace(post.CoverMediaURL) != "" || strings.TrimSpace(post.ThumbnailURL) != "" {
		score += 12
	}
	if strings.TrimSpace(meta.PosterURL) != "" {
		score += 4
	}
	if strings.TrimSpace(post.Caption) != "" {
		score += 8
	}
	if strings.TrimSpace(post.CTA) != "" {
		score += 4
	}
	switch strings.ToLower(strings.TrimSpace(post.Type)) {
	case "video":
		score += 12
		if meta.DurationSeconds > 0 && meta.DurationSeconds <= 90 {
			score += 6
		}
		if strings.TrimSpace(meta.StreamURLHLS) != "" {
			score += 6
		}
	case "promo":
		score += 10
	case "update":
		score += 6
	default:
		score += 8
	}
	if meta.Width >= 1080 || meta.Height >= 1080 {
		score += 4
	}
	if strings.EqualFold(post.Visibility, "highlight") {
		score += 8
	}
	if post.PublishedAt != nil {
		ageHours := time.Since(*post.PublishedAt).Hours()
		switch {
		case ageHours <= 24:
			score += 20
		case ageHours <= 72:
			score += 12
		case ageHours <= 168:
			score += 6
		}
	}
	if tenantItem.DiscoveryCtr30d >= 4 {
		score += 6
	}
	return score
}

func discoveryPostPerformanceScore(item DiscoveryFeedItem) int {
	score := 0
	if item.PostClicks7d > 0 {
		score += minInt(int(item.PostClicks7d)*4, 32)
	}
	if item.PostCTR7d > 0 {
		score += minInt(int(item.PostCTR7d*3), 30)
	}
	if item.PostImpressions7d >= 12 {
		score += minInt(int(item.PostImpressions7d/4), 12)
	}
	if item.PostDetailViews7d > 0 {
		score += minInt(int(item.PostDetailViews7d)*3, 24)
	}
	if item.PostTenantOpens7d > 0 {
		score += minInt(int(item.PostTenantOpens7d)*5, 28)
	}
	if item.PostRelatedClicks7d > 0 {
		score += minInt(int(item.PostRelatedClicks7d)*2, 14)
	}
	if item.PostRelatedTenantOpens7d > 0 {
		score += minInt(int(item.PostRelatedTenantOpens7d)*3, 18)
	}
	if item.PostDetailViews7d > 0 && item.PostTenantOpens7d > 0 {
		score += minInt(int(item.PostTenantOpens7d)*2, 12)
	}
	if item.PostBookingStarts7d > 0 {
		score += minInt(int(item.PostBookingStarts7d)*12, 48)
	}
	if item.PostLastInteractionAt != nil {
		ageHours := time.Since(*item.PostLastInteractionAt).Hours()
		switch {
		case ageHours <= 24:
			score += 8
		case ageHours <= 72:
			score += 4
		}
	}
	return score
}

func scoreFeaturedSectionItem(item DiscoveryFeedItem) int {
	score := item.FeedScore
	if item.ItemKind == "post" {
		score += 10
	}
	if strings.TrimSpace(item.FeedImageURL) != "" {
		score += 18
	}
	if item.IsFeatured {
		score += 14
	}
	if strings.EqualFold(item.PostVisibility, "highlight") {
		score += 10
	}
	return score
}

func scoreTrendingSectionItem(item DiscoveryFeedItem) int {
	score := item.FeedScore/2 + minInt(int(item.DiscoveryClicks30d)*5, 40) + minInt(int(item.DiscoveryCtr30d*4), 28)
	score += minInt(int(item.PostClicks7d)*6, 36) + minInt(int(item.PostCTR7d*4), 26)
	if item.ItemKind == "post" {
		score += 12
	}
	if isRecentPost(item, 72*time.Hour) {
		score += 16
	}
	return score
}

func scoreValueSectionItem(item DiscoveryFeedItem) int {
	if item.StartingPrice <= 0 {
		return -1
	}
	score := item.FeedScore / 3
	switch {
	case item.StartingPrice <= 10000:
		score += 32
	case item.StartingPrice <= 50000:
		score += 24
	case item.StartingPrice <= 100000:
		score += 18
	case item.StartingPrice <= 150000:
		score += 10
	default:
		score += 2
	}
	if item.ResourceCount >= 3 {
		score += 8
	}
	if item.ItemKind == "post" {
		score += 4
	}
	return score
}

func scoreFreshSectionItem(item DiscoveryFeedItem) int {
	score := item.FeedScore / 4
	if item.IsNew {
		score += 26
	}
	if isRecentPost(item, 24*time.Hour) {
		score += 34
	} else if isRecentPost(item, 7*24*time.Hour) {
		score += 20
	}
	if item.ItemKind == "post" {
		score += 8
	}
	return score
}

func scoreLateNightSectionItem(item DiscoveryFeedItem) int {
	score := item.FeedScore / 3
	if closesLate(item.CloseTime) {
		score += 28
	}
	if item.ItemKind == "post" {
		score += 4
	}
	if item.StartingPrice > 0 && item.StartingPrice <= 100000 {
		score += 6
	}
	return score
}

func scoreForYouSectionItem(item DiscoveryFeedItem, signals *CustomerDiscoverySignals) int {
	score := item.FeedScore/3 + (item.PersonalizationScore * 2)
	if signals == nil {
		return score
	}
	if signals.VisitedTenants[item.TenantID] > 0 {
		score += minInt(signals.VisitedTenants[item.TenantID]*14, 28)
	}
	if signals.FavoriteCategories[strings.ToLower(strings.TrimSpace(item.BusinessCategory))] > 0 {
		score += minInt(signals.FavoriteCategories[strings.ToLower(strings.TrimSpace(item.BusinessCategory))]*8, 24)
	}
	if signals.FavoriteTypes[strings.ToLower(strings.TrimSpace(item.BusinessType))] > 0 {
		score += minInt(signals.FavoriteTypes[strings.ToLower(strings.TrimSpace(item.BusinessType))]*6, 18)
	}
	if signals.AverageSpend > 0 && item.StartingPrice > 0 && item.StartingPrice <= (signals.AverageSpend*0.75) {
		score += 8
	}
	if signals.EveningBookings > 0 && closesLate(item.CloseTime) {
		score += 10
	}
	return score
}

func scoreRepeatSectionItem(item DiscoveryFeedItem, signals *CustomerDiscoverySignals) int {
	if signals == nil {
		return -1
	}
	repeatCount := signals.VisitedTenants[item.TenantID]
	if repeatCount == 0 {
		return -1
	}
	score := item.FeedScore/3 + minInt(repeatCount*24, 60)
	if item.ItemKind == "post" {
		score += 12
	}
	return score
}

func scoreFreshCustomerSectionItem(item DiscoveryFeedItem, signals *CustomerDiscoverySignals) int {
	score := scoreFreshSectionItem(item) + item.PersonalizationScore
	if signals != nil && signals.EveningBookings > 0 && closesLate(item.CloseTime) {
		score += 8
	}
	return score
}

func scoreBudgetSectionItem(item DiscoveryFeedItem, signals *CustomerDiscoverySignals) int {
	if signals == nil || signals.AverageSpend <= 0 || item.StartingPrice <= 0 {
		return -1
	}
	diff := signals.AverageSpend - item.StartingPrice
	if diff < 0 {
		diff = item.StartingPrice - signals.AverageSpend
	}
	score := item.FeedScore / 4
	switch {
	case diff <= signals.AverageSpend*0.15:
		score += 28
	case diff <= signals.AverageSpend*0.30:
		score += 18
	case item.StartingPrice <= signals.AverageSpend:
		score += 12
	default:
		score += 4
	}
	if item.ItemKind == "post" {
		score += 4
	}
	return score
}

func isRecentPost(item DiscoveryFeedItem, within time.Duration) bool {
	return item.PostPublishedAt != nil && time.Since(*item.PostPublishedAt) <= within
}

func discoveryFeedItemSortTime(item DiscoveryFeedItem) time.Time {
	if item.PostPublishedAt != nil {
		return *item.PostPublishedAt
	}
	return item.CreatedAt
}

func hasPostFeedItems(items []DiscoveryFeedItem) bool {
	for _, item := range items {
		if item.ItemKind == "post" {
			return true
		}
	}
	return false
}

func sectionDescription(hasPosts bool, withPosts string, withoutPosts string) string {
	if hasPosts {
		return withPosts
	}
	return withoutPosts
}

func publicFeedHeroDescription(hasPosts bool) string {
	return sectionDescription(
		hasPosts,
		"Feed Bookinaja menggabungkan tampilan bisnis dan postingan tenant dengan ranking yang sama, supaya discovery terasa lebih hidup daripada daftar bisnis biasa.",
		"Feed Bookinaja menata profil bisnis dengan ranking yang lebih rapi, supaya discovery terasa lebih hidup daripada daftar bisnis biasa.",
	)
}

func customerFeedHeroDescription(hasPosts bool) string {
	return sectionDescription(
		hasPosts,
		"Feed customer Bookinaja memadukan minat kategori, riwayat booking, kualitas listing, dan postingan tenant untuk menampilkan sesuatu yang terasa lebih relevan.",
		"Feed customer Bookinaja memadukan minat kategori, riwayat booking, dan kualitas listing untuk menampilkan bisnis yang terasa lebih relevan.",
	)
}

func buildDiscoveryHeadline(item TenantDirectoryItem) string {
	if text := strings.TrimSpace(item.Tagline); text != "" {
		return text
	}
	if text := strings.TrimSpace(item.Slogan); text != "" {
		return text
	}
	category := prettifyLabel(item.BusinessCategory)
	if category == "" {
		category = "tempat baru"
	}
	return fmt.Sprintf("Temukan pengalaman %s yang lebih mudah dipesan.", strings.ToLower(category))
}

func buildDiscoverySubheadline(item TenantDirectoryItem) string {
	parts := []string{}
	if item.TopResourceName != "" {
		parts = append(parts, fmt.Sprintf("Highlight: %s", item.TopResourceName))
	}
	if item.StartingPrice > 0 {
		parts = append(parts, fmt.Sprintf("Mulai dari Rp%.0f", item.StartingPrice))
	}
	if item.ResourceCount > 0 {
		parts = append(parts, fmt.Sprintf("%d pilihan resource", item.ResourceCount))
	}
	if len(parts) == 0 {
		if text := strings.TrimSpace(item.AboutUs); text != "" {
			return text
		}
		return "Jelajahi bisnis ini dan lihat apakah cocok untuk rencana berikutnya."
	}
	return strings.Join(parts, " • ")
}

func buildDiscoveryTags(item TenantDirectoryItem) []string {
	tags := []string{}
	if category := prettifyLabel(item.BusinessCategory); category != "" {
		tags = append(tags, category)
	}
	if businessType := prettifyLabel(item.BusinessType); businessType != "" && !containsIgnoreCase(tags, businessType) {
		tags = append(tags, businessType)
	}
	if item.TopResourceType != "" && !containsIgnoreCase(tags, item.TopResourceType) {
		tags = append(tags, prettifyLabel(item.TopResourceType))
	}
	if item.ResourceCount >= 5 {
		tags = append(tags, "Pilihan Lengkap")
	}
	return tags[:minInt(len(tags), 4)]
}

func buildDiscoveryBadges(item TenantDirectoryItem) []string {
	badges := []string{}
	if item.DiscoveryCtr30d >= 5 && item.DiscoveryClicks30d >= 5 {
		badges = append(badges, "Lagi Ramai")
	}
	if closesLate(item.CloseTime) {
		badges = append(badges, "Buka Sampai Malam")
	}
	if item.ResourceCount >= 4 {
		badges = append(badges, "Banyak Pilihan")
	}
	if item.StartingPrice > 0 && item.StartingPrice <= 100000 {
		badges = append(badges, "Mulai Ramah Budget")
	}
	return badges[:minInt(len(badges), 3)]
}

func buildPromoLabel(item TenantDirectoryItem, entry TenantDirectoryItem) string {
	if item.DiscoveryCtr30d >= 5 && item.DiscoveryClicks30d >= 5 {
		return "Lagi banyak dilihat"
	}
	if entry.IsNew {
		return "Baru di Bookinaja"
	}
	if item.StartingPrice > 0 && item.StartingPrice <= 100000 {
		return "Mulai dari harga ringan"
	}
	if item.ResourceCount >= 5 {
		return "Pilihan resource lengkap"
	}
	return ""
}

func curatedPromoLabel(item TenantDirectoryItem, promoActive bool) string {
	if !promoActive {
		return ""
	}
	if text := strings.TrimSpace(item.PromoLabel); text != "" {
		return text
	}
	if item.DiscoveryPromoted {
		return "Promo aktif"
	}
	return ""
}

func buildFeaturedReason(item TenantDirectoryItem, entry TenantDirectoryItem) string {
	if item.DiscoveryClicks30d >= 5 && item.DiscoveryCtr30d >= 4 {
		return fmt.Sprintf("Sedang menarik perhatian customer dengan CTR %.1f%% dalam 30 hari terakhir.", item.DiscoveryCtr30d)
	}
	if entry.IsNew {
		return "Cocok buat yang suka coba tempat baru lebih awal."
	}
	if item.StartingPrice > 0 && item.ResourceCount > 0 {
		return fmt.Sprintf("Mulai dari Rp%.0f dengan %d pilihan resource.", item.StartingPrice, item.ResourceCount)
	}
	if item.TopResourceName != "" {
		return fmt.Sprintf("Paling cocok kalau kamu ingin langsung cek %s.", item.TopResourceName)
	}
	return "Layak dijelajahi untuk rencana booking berikutnya."
}

func buildAvailabilityHint(item TenantDirectoryItem) string {
	if item.DiscoveryClicks30d >= 5 {
		return "Sedang aktif dijelajahi customer lain di Bookinaja."
	}
	if item.ResourceCount >= 6 {
		return "Lebih banyak pilihan resource untuk dicoba."
	}
	if closesLate(item.CloseTime) {
		return "Cocok untuk booking sore sampai malam."
	}
	if item.StartingPrice > 0 {
		return fmt.Sprintf("Bisa mulai eksplor dari Rp%.0f.", item.StartingPrice)
	}
	return "Lihat detail bisnis untuk tahu apa yang bisa kamu lakukan di sini."
}

func closesLate(closeTime string) bool {
	closeTime = strings.TrimSpace(closeTime)
	if closeTime == "" {
		return false
	}
	parsed, err := time.Parse("15:04", closeTime)
	if err != nil {
		return false
	}
	return parsed.Hour() >= 21
}

func prettifyLabel(value string) string {
	value = strings.TrimSpace(strings.ReplaceAll(value, "_", " "))
	if value == "" {
		return ""
	}
	return strings.Title(strings.ToLower(value))
}

func containsIgnoreCase(values []string, candidate string) bool {
	for _, value := range values {
		if strings.EqualFold(strings.TrimSpace(value), strings.TrimSpace(candidate)) {
			return true
		}
	}
	return false
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Register menangani pendaftaran tenant baru & inisialisasi default branding
func (s *Service) Register(ctx context.Context, req RegisterReq) (*Tenant, error) {
	slug := strings.ToLower(strings.TrimSpace(req.TenantSlug))

	// 1. Validasi keberadaan slug dan email
	slugEx, emailEx, err := s.repo.Exists(ctx, slug, req.AdminEmail)
	if err != nil {
		return nil, err
	}
	if slugEx {
		return nil, errors.New("subdomain sudah digunakan")
	}
	if emailEx {
		return nil, errors.New("email sudah terdaftar")
	}

	// 2. Hash Password Owner
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.AdminPass), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	tID := uuid.New()
	now := time.Now().UTC()
	referralCode := generateReferralCode(req.TenantSlug)
	var referredBy *uuid.UUID
	if code := strings.TrimSpace(strings.ToLower(req.ReferralCode)); code != "" {
		if refTenant, err := s.repo.GetByReferralCode(ctx, code); err == nil && refTenant != nil {
			referredBy = &refTenant.ID
		} else {
			return nil, errors.New("kode referral tidak valid")
		}
	}

	// --- DYNAMIC DEFAULT BRANDING ---
	defaultColor := "#3b82f6"
	defaultTagline := "Professional Booking System"
	defaultSlogan := "Control your branch, grow your business"
	defaultAbout := "Kami menyediakan layanan berkualitas dengan sistem manajemen modern."
	var defaultFeatures pq.StringArray

	switch req.BusinessCategory {
	case "gaming_hub":
		defaultColor = "#2563eb"
		defaultTagline = "The Ultimate Arena for Pro Players"
		defaultSlogan = "Experience Gaming at its Peak"
		defaultAbout = "Pusat gaming dengan spesifikasi PC tertinggi dan koneksi internet stabil."
		defaultFeatures = pq.StringArray{"RTX 4090 Ready", "Internet 1Gbps", "Pro Peripherals", "240Hz Monitor"}
	case "creative_space":
		defaultColor = "#e11d48"
		defaultTagline = "Studio Creative for Unlimited Ideas"
		defaultFeatures = pq.StringArray{"Pro Lighting", "Set Aesthetic", "High-End Camera", "Private Studio"}
	case "sport_center":
		defaultColor = "#10b981"
		defaultTagline = "World Class Sports Facility"
		defaultFeatures = pq.StringArray{"Vinyl Court", "Locker Room", "Standard Inter", "Training Gear"}
	case "social_space":
		defaultColor = "#4f46e5"
		defaultTagline = "Elite Space for Collaboration"
		defaultFeatures = pq.StringArray{"Fast Wi-Fi", "Free Coffee", "Focus Zone", "Meeting Room"}
	}

	tenant := Tenant{
		ID:                             tID,
		Name:                           req.TenantName,
		Slug:                           slug,
		BusinessCategory:               req.BusinessCategory,
		BusinessType:                   req.BusinessType,
		Plan:                           "starter",
		SubscriptionStatus:             "trial",
		SubscriptionCurrentPeriodStart: ptrTime(now),
		SubscriptionCurrentPeriodEnd:   ptrTime(now.Add(freeTrialDuration)),
		Tagline:                        defaultTagline,
		Slogan:                         defaultSlogan,
		AboutUs:                        defaultAbout,
		Features:                       defaultFeatures,
		PrimaryColor:                   defaultColor,
		DiscoveryHeadline:              defaultTagline,
		DiscoverySubheadline:           "Temukan pengalaman yang paling cocok untuk rencana berikutnya.",
		DiscoveryTags:                  pq.StringArray{prettifyLabel(req.BusinessCategory)},
		DiscoveryBadges:                pq.StringArray{},
		PromoLabel:                     "Baru di Bookinaja",
		DiscoveryFeatured:              false,
		DiscoveryPromoted:              false,
		DiscoveryPriority:              0,
		PromoStartsAt:                  nil,
		PromoEndsAt:                    nil,
		ReceiptTitle:                   "Struk Bookinaja",
		ReceiptSubtitle:                "Bukti transaksi resmi",
		ReceiptFooter:                  "Terima kasih sudah berkunjung",
		ReceiptWhatsAppText:            "Berikut struk transaksi Anda dari Bookinaja.",
		ReceiptChannel:                 "whatsapp",
		PrinterMode:                    "whatsapp",
		PrinterStatus:                  "disconnected",
		ReferralCode:                   referralCode,
		ReferredByTenantID:             referredBy,
		CreatedAt:                      now,
	}

	user := User{
		ID:        uuid.New(),
		TenantID:  tID,
		Name:      req.AdminName,
		Email:     req.AdminEmail,
		Password:  string(hashed),
		Role:      "owner",
		CreatedAt: time.Now(),
	}

	// 3. Simpan ke Database
	if err := s.repo.CreateWithAdmin(ctx, tenant, user); err != nil {
		return nil, err
	}

	// 4. Seeding Template Asynchronous
	go s.SeedTemplate(context.Background(), tID, req.BusinessCategory)

	return &tenant, nil
}

func generateReferralCode(slug string) string {
	base := strings.ToUpper(strings.TrimSpace(slug))
	base = strings.ReplaceAll(base, " ", "")
	base = strings.ReplaceAll(base, ".", "")
	base = strings.ReplaceAll(base, "-", "")
	if base == "" {
		base = "BOOK"
	}
	if len(base) > 8 {
		base = base[:8]
	}
	return fmt.Sprintf("%s%s", base, strings.ToUpper(uuid.NewString()[:4]))
}

func ptrTime(t time.Time) *time.Time {
	v := t
	return &v
}

// SeedTemplate menyuntikkan data awal berdasarkan kategori bisnis
// SeedTemplate menyuntikkan data awal berdasarkan kategori bisnis
func (s *Service) SeedTemplate(ctx context.Context, tenantID uuid.UUID, category string) {
	file, err := os.ReadFile("internal/tenant/templates.json")
	if err != nil {
		log.Printf("[SEEDER] Error read template file: %v", err)
		return
	}

	var allTemplates map[string]struct {
		Resources []struct {
			Name        string `json:"name"`
			Category    string `json:"category"`
			Description string `json:"description"`
			ImageURL    string `json:"image_url"`
		} `json:"resources"`
		MainItems []struct {
			Name         string  `json:"name"`
			Price        float64 `json:"price"`
			PriceUnit    string  `json:"price_unit"`
			UnitDuration int     `json:"unit_duration"`
			IsDefault    bool    `json:"is_default"`
		} `json:"main_items"`
		UnitAddons []struct {
			Name         string  `json:"name"`
			Price        float64 `json:"price"`
			PriceUnit    string  `json:"price_unit"`
			UnitDuration int     `json:"unit_duration"`
		} `json:"unit_addons"`
		FnbCatalog []struct {
			Name     string  `json:"name"`
			Price    float64 `json:"price"`
			Category string  `json:"category"`
			ImageURL string  `json:"image_url"`
		} `json:"fnb_catalog"`
	}

	if err := json.Unmarshal(file, &allTemplates); err != nil {
		log.Printf("[SEEDER] Error unmarshal template: %v", err)
		return
	}

	tpl, ok := allTemplates[category]
	if !ok {
		log.Printf("[SEEDER] Category %s template not found", category)
		return
	}

	emptyMeta := json.RawMessage("{}")

	var resourcesToSeed []resource.Resource
	for _, r := range tpl.Resources {
		res := resource.Resource{
			Name:        r.Name,
			Category:    r.Category,
			Description: r.Description,
			ImageURL:    r.ImageURL,
			Gallery:     []string{},
			Metadata:    &emptyMeta,
		}

		for _, mi := range tpl.MainItems {
			duration := mi.UnitDuration
			if duration <= 0 {
				duration = s.getDefaultDuration(mi.PriceUnit)
			}
			res.Items = append(res.Items, resource.ResourceItem{
				Name:         mi.Name,
				Price:        mi.Price,
				PriceUnit:    mi.PriceUnit,
				UnitDuration: duration,
				ItemType:     "main_option",
				IsDefault:    mi.IsDefault,
				Metadata:     &emptyMeta,
			})
		}

		for _, ua := range tpl.UnitAddons {
			duration := ua.UnitDuration
			if duration <= 0 {
				duration = s.getDefaultDuration(ua.PriceUnit)
			}
			res.Items = append(res.Items, resource.ResourceItem{
				Name:         ua.Name,
				Price:        ua.Price,
				PriceUnit:    ua.PriceUnit,
				UnitDuration: duration,
				ItemType:     "add_on",
				IsDefault:    false,
				Metadata:     &emptyMeta,
			})
		}
		resourcesToSeed = append(resourcesToSeed, res)
	}

	var fnbToSeed []fnb.Item
	for _, f := range tpl.FnbCatalog {
		imgURL := f.ImageURL
		fnbToSeed = append(fnbToSeed, fnb.Item{
			Name:        f.Name,
			Price:       f.Price,
			Category:    f.Category,
			ImageURL:    &imgURL,
			IsAvailable: true,
		})
	}

	if err := s.repo.SeedTenantData(ctx, tenantID, resourcesToSeed); err != nil {
		log.Printf("[SEEDER] DB Error resources: %v", err)
	}
	if err := s.repo.SeedFnbData(ctx, tenantID, fnbToSeed); err != nil {
		log.Printf("[SEEDER] DB Error fnb: %v", err)
	}

	log.Printf("[SEEDER] ✅ SUCCESS: Template %s applied for tenant %s", category, tenantID)
}

func (s *Service) getDefaultDuration(unit string) int {
	switch strings.ToLower(unit) {
	case "hour":
		return 60
	case "day":
		return 1440
	default:
		return 0
	}
}

func (s *Service) Login(ctx context.Context, email, password, tenantSlug string) (*LoginResponse, error) {
	var (
		u   *User
		err error
	)

	if strings.TrimSpace(tenantSlug) != "" {
		u, err = s.repo.GetUserByEmailAndSlug(ctx, email, tenantSlug)
	} else {
		u, err = s.repo.GetUserByEmail(ctx, email)
	}
	if err != nil || u == nil {
		return nil, errors.New("email atau password salah")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password)); err != nil {
		return nil, errors.New("email atau password salah")
	}

	token, err := s.authService.GenerateToken(u.ID, u.TenantID, u.Role)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{Token: token, User: *u}, nil
}

func (s *Service) GetProfile(ctx context.Context, id uuid.UUID) (*Tenant, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) GetReceiptSettings(ctx context.Context, id uuid.UUID) (*Tenant, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) GetReferralSummary(ctx context.Context, id uuid.UUID) (map[string]any, error) {
	tenant, err := s.repo.GetByID(ctx, id)
	if err != nil || tenant == nil {
		return nil, errors.New("tenant tidak ditemukan")
	}
	summary, err := s.repo.ReferralSummary(ctx, id)
	if err != nil {
		return nil, err
	}
	summary["referral_code"] = tenant.ReferralCode
	summary["payout_bank_name"] = tenant.PayoutBankName
	summary["payout_account_name"] = tenant.PayoutAccountName
	summary["payout_account_number"] = tenant.PayoutAccountNumber
	summary["payout_whatsapp"] = tenant.PayoutWhatsApp
	return summary, nil
}

func (s *Service) ListReferralFriends(ctx context.Context, id uuid.UUID) ([]ReferralListItem, error) {
	return s.repo.GetReferralChildren(ctx, id)
}

func (s *Service) RequestReferralWithdrawal(ctx context.Context, actorUserID uuid.UUID, tenantID uuid.UUID, amount int64, note string) (*ReferralWithdrawalRequest, error) {
	if amount <= 0 {
		return nil, errors.New("jumlah penarikan harus lebih dari nol")
	}

	tenant, err := s.repo.GetByID(ctx, tenantID)
	if err != nil || tenant == nil {
		return nil, errors.New("tenant tidak ditemukan")
	}
	if strings.TrimSpace(tenant.PayoutBankName) == "" || strings.TrimSpace(tenant.PayoutAccountName) == "" || strings.TrimSpace(tenant.PayoutAccountNumber) == "" || strings.TrimSpace(tenant.PayoutWhatsApp) == "" {
		return nil, errors.New("rekening pencairan belum lengkap")
	}

	summary, err := s.repo.ReferralSummary(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	available := int64(0)
	if raw, ok := summary["available_balance"].(int64); ok {
		available = raw
	}
	if available < amount {
		return nil, errors.New("saldo tersedia tidak mencukupi")
	}

	req := ReferralWithdrawalRequest{
		ID:                uuid.New(),
		TenantID:          tenantID,
		Amount:            amount,
		Status:            "pending",
		RequestedByUserID: &actorUserID,
		Note:              note,
		Metadata:          []byte(`{}`),
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}
	if err := s.repo.RequestReferralWithdrawal(ctx, req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (s *Service) ListReferralWithdrawals(ctx context.Context, tenantID uuid.UUID) ([]ReferralWithdrawalRequest, error) {
	return s.repo.ListReferralWithdrawals(ctx, tenantID)
}

func (s *Service) UpdateReferralPayout(ctx context.Context, actorUserID uuid.UUID, id uuid.UUID, req Tenant) (*Tenant, error) {
	curr, err := s.repo.GetByID(ctx, id)
	if err != nil || curr == nil {
		return nil, errors.New("tenant tidak ditemukan")
	}
	req.ID = id
	req.Slug = curr.Slug
	req.Name = curr.Name
	req.BusinessCategory = curr.BusinessCategory
	req.BusinessType = curr.BusinessType
	req.Plan = curr.Plan
	req.SubscriptionStatus = curr.SubscriptionStatus
	req.SubscriptionCurrentPeriodStart = curr.SubscriptionCurrentPeriodStart
	req.SubscriptionCurrentPeriodEnd = curr.SubscriptionCurrentPeriodEnd
	req.Slogan = curr.Slogan
	req.Tagline = curr.Tagline
	req.AboutUs = curr.AboutUs
	req.Features = curr.Features
	req.PrimaryColor = curr.PrimaryColor
	req.LogoURL = curr.LogoURL
	req.BannerURL = curr.BannerURL
	req.Gallery = curr.Gallery
	req.DiscoveryHeadline = curr.DiscoveryHeadline
	req.DiscoverySubheadline = curr.DiscoverySubheadline
	req.DiscoveryTags = curr.DiscoveryTags
	req.DiscoveryBadges = curr.DiscoveryBadges
	req.PromoLabel = curr.PromoLabel
	req.FeaturedImageURL = curr.FeaturedImageURL
	req.HighlightCopy = curr.HighlightCopy
	req.DiscoveryFeatured = curr.DiscoveryFeatured
	req.DiscoveryPromoted = curr.DiscoveryPromoted
	req.DiscoveryPriority = curr.DiscoveryPriority
	req.PromoStartsAt = curr.PromoStartsAt
	req.PromoEndsAt = curr.PromoEndsAt
	req.Address = curr.Address
	req.WhatsappNumber = curr.WhatsappNumber
	req.InstagramURL = curr.InstagramURL
	req.TiktokURL = curr.TiktokURL
	req.MapIframeURL = curr.MapIframeURL
	req.MetaTitle = curr.MetaTitle
	req.MetaDescription = curr.MetaDescription
	req.OpenTime = curr.OpenTime
	req.CloseTime = curr.CloseTime
	req.ReferralCode = curr.ReferralCode
	req.ReferredByTenantID = curr.ReferredByTenantID
	req.ReceiptTitle = curr.ReceiptTitle
	req.ReceiptSubtitle = curr.ReceiptSubtitle
	req.ReceiptFooter = curr.ReceiptFooter
	req.ReceiptWhatsAppText = curr.ReceiptWhatsAppText
	req.ReceiptTemplate = curr.ReceiptTemplate
	req.ReceiptChannel = curr.ReceiptChannel
	req.PrinterEnabled = curr.PrinterEnabled
	req.PrinterName = curr.PrinterName
	req.PrinterMode = curr.PrinterMode
	req.PrinterEndpoint = curr.PrinterEndpoint
	req.PrinterAutoPrint = curr.PrinterAutoPrint
	req.PrinterStatus = curr.PrinterStatus
	req.CreatedAt = curr.CreatedAt
	if err := s.repo.Update(ctx, req); err != nil {
		return nil, err
	}
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     id,
		ActorUserID:  &actorUserID,
		Action:       "update_referral_payout",
		ResourceType: "tenant",
		ResourceID:   &id,
		Metadata:     []byte(`{}`),
		CreatedAt:    time.Now().UTC(),
	})
	return &req, nil
}

func (s *Service) UpdateProfile(ctx context.Context, actorUserID uuid.UUID, id uuid.UUID, req Tenant) (*Tenant, error) {
	curr, err := s.repo.GetByID(ctx, id)
	if err != nil || curr == nil {
		return nil, errors.New("tenant tidak ditemukan")
	}

	req.ID = id
	req.Slug = curr.Slug
	req.ReferralCode = curr.ReferralCode
	req.ReferredByTenantID = curr.ReferredByTenantID
	req.PayoutBankName = curr.PayoutBankName
	req.PayoutAccountName = curr.PayoutAccountName
	req.PayoutAccountNumber = curr.PayoutAccountNumber
	req.PayoutWhatsApp = curr.PayoutWhatsApp
	req.CreatedAt = curr.CreatedAt

	if err := s.repo.Update(ctx, req); err != nil {
		return nil, err
	}

	metadata, _ := json.Marshal(map[string]any{
		"tenant_name": req.Name,
		"tenant_slug": req.Slug,
	})
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     id,
		ActorUserID:  &actorUserID,
		Action:       "update_business_profile",
		ResourceType: "tenant",
		ResourceID:   &id,
		Metadata:     metadata,
		CreatedAt:    time.Now().UTC(),
	})

	return &req, nil
}

func (s *Service) UpdateReceiptSettings(ctx context.Context, actorUserID uuid.UUID, id uuid.UUID, req Tenant) (*Tenant, error) {
	curr, err := s.repo.GetByID(ctx, id)
	if err != nil || curr == nil {
		return nil, errors.New("tenant tidak ditemukan")
	}

	req.ID = id
	req.Slug = curr.Slug
	req.Name = curr.Name
	req.BusinessCategory = curr.BusinessCategory
	req.BusinessType = curr.BusinessType
	req.Plan = curr.Plan
	req.SubscriptionStatus = curr.SubscriptionStatus
	req.SubscriptionCurrentPeriodStart = curr.SubscriptionCurrentPeriodStart
	req.SubscriptionCurrentPeriodEnd = curr.SubscriptionCurrentPeriodEnd
	req.Slogan = curr.Slogan
	req.Tagline = curr.Tagline
	req.AboutUs = curr.AboutUs
	req.Features = curr.Features
	req.PrimaryColor = curr.PrimaryColor
	req.LogoURL = curr.LogoURL
	req.BannerURL = curr.BannerURL
	req.Gallery = curr.Gallery
	req.DiscoveryHeadline = curr.DiscoveryHeadline
	req.DiscoverySubheadline = curr.DiscoverySubheadline
	req.DiscoveryTags = curr.DiscoveryTags
	req.DiscoveryBadges = curr.DiscoveryBadges
	req.PromoLabel = curr.PromoLabel
	req.FeaturedImageURL = curr.FeaturedImageURL
	req.HighlightCopy = curr.HighlightCopy
	req.DiscoveryFeatured = curr.DiscoveryFeatured
	req.DiscoveryPromoted = curr.DiscoveryPromoted
	req.DiscoveryPriority = curr.DiscoveryPriority
	req.PromoStartsAt = curr.PromoStartsAt
	req.PromoEndsAt = curr.PromoEndsAt
	req.Address = curr.Address
	req.WhatsappNumber = curr.WhatsappNumber
	req.InstagramURL = curr.InstagramURL
	req.TiktokURL = curr.TiktokURL
	req.MapIframeURL = curr.MapIframeURL
	req.MetaTitle = curr.MetaTitle
	req.MetaDescription = curr.MetaDescription
	req.OpenTime = curr.OpenTime
	req.CloseTime = curr.CloseTime
	req.ReferralCode = curr.ReferralCode
	req.ReferredByTenantID = curr.ReferredByTenantID
	req.PayoutBankName = curr.PayoutBankName
	req.PayoutAccountName = curr.PayoutAccountName
	req.PayoutAccountNumber = curr.PayoutAccountNumber
	req.PayoutWhatsApp = curr.PayoutWhatsApp
	req.CreatedAt = curr.CreatedAt

	if err := s.repo.Update(ctx, req); err != nil {
		return nil, err
	}

	metadata, _ := json.Marshal(map[string]any{
		"receipt_title":      req.ReceiptTitle,
		"printer_enabled":    req.PrinterEnabled,
		"printer_name":       req.PrinterName,
		"printer_mode":       req.PrinterMode,
		"receipt_channel":    req.ReceiptChannel,
		"printer_status":     req.PrinterStatus,
		"printer_auto_print": req.PrinterAutoPrint,
	})
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     id,
		ActorUserID:  &actorUserID,
		Action:       "update_receipt_settings",
		ResourceType: "tenant",
		ResourceID:   &id,
		Metadata:     metadata,
		CreatedAt:    time.Now().UTC(),
	})

	return &req, nil
}

func (s *Service) ListStaff(ctx context.Context, tenantID uuid.UUID) ([]User, error) {
	return s.repo.ListUsersByTenant(ctx, tenantID)
}

func (s *Service) ListStaffRoles(ctx context.Context, tenantID uuid.UUID) ([]StaffRole, error) {
	return s.repo.ListStaffRoles(ctx, tenantID)
}

func (s *Service) CreateStaffRole(ctx context.Context, tenantID uuid.UUID, req StaffRoleReq) (*StaffRole, error) {
	role := StaffRole{
		ID:             uuid.New(),
		TenantID:       tenantID,
		Name:           strings.TrimSpace(req.Name),
		Description:    strings.TrimSpace(req.Description),
		PermissionKeys: sanitizePermissions(req.PermissionKeys),
		IsDefault:      req.IsDefault,
	}
	if role.IsDefault {
		_ = s.repo.ClearDefaultRoles(ctx, tenantID)
	}
	return s.repo.CreateStaffRole(ctx, role)
}

func (s *Service) UpdateStaffRole(ctx context.Context, tenantID, roleID uuid.UUID, req StaffRoleReq) (*StaffRole, error) {
	role := StaffRole{
		ID:             roleID,
		TenantID:       tenantID,
		Name:           strings.TrimSpace(req.Name),
		Description:    strings.TrimSpace(req.Description),
		PermissionKeys: sanitizePermissions(req.PermissionKeys),
		IsDefault:      req.IsDefault,
	}
	if role.IsDefault {
		_ = s.repo.ClearDefaultRoles(ctx, tenantID)
	}
	return s.repo.UpdateStaffRole(ctx, role)
}

func (s *Service) DeleteStaffRole(ctx context.Context, tenantID, roleID uuid.UUID) error {
	return s.repo.DeleteStaffRole(ctx, tenantID, roleID)
}

func (s *Service) CreateStaff(ctx context.Context, actorUserID uuid.UUID, tenantID uuid.UUID, req StaffCreateReq) (*User, error) {
	existing, err := s.repo.GetUserByEmail(ctx, strings.TrimSpace(req.Email))
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("email staff sudah terdaftar")
	}
	roleID, err := uuid.Parse(req.RoleID)
	if err != nil {
		return nil, errors.New("role staff tidak valid")
	}
	role, err := s.repo.GetStaffRoleByID(ctx, tenantID, roleID)
	if err != nil {
		return nil, err
	}
	if role == nil {
		return nil, errors.New("role staff tidak ditemukan")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	staff, err := s.repo.CreateStaff(ctx, tenantID, req.Name, req.Email, string(hashed), role.ID)
	if err != nil {
		return nil, err
	}

	metadata, _ := json.Marshal(map[string]any{
		"name":  req.Name,
		"email": req.Email,
		"role":  role.Name,
	})
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     tenantID,
		ActorUserID:  &actorUserID,
		Action:       "create_staff",
		ResourceType: "user",
		ResourceID:   &staff.ID,
		Metadata:     metadata,
		CreatedAt:    time.Now().UTC(),
	})

	return staff, nil
}

func (s *Service) UpdateStaff(ctx context.Context, actorUserID uuid.UUID, tenantID, staffID uuid.UUID, req StaffUpdateReq) (*User, error) {
	target, _, err := s.repo.GetUserByID(ctx, staffID)
	if err != nil {
		return nil, err
	}
	if target == nil || target.TenantID != tenantID || target.Role != "staff" {
		return nil, errors.New("pegawai tidak ditemukan")
	}

	var roleID uuid.UUID
	if strings.TrimSpace(req.RoleID) != "" {
		roleID, err = uuid.Parse(req.RoleID)
		if err != nil {
			return nil, errors.New("role staff tidak valid")
		}
		role, err := s.repo.GetStaffRoleByID(ctx, tenantID, roleID)
		if err != nil {
			return nil, err
		}
		if role == nil {
			return nil, errors.New("role staff tidak ditemukan")
		}
	} else if target.RoleID != nil {
		roleID = *target.RoleID
	}

	updated, err := s.repo.UpdateStaff(ctx, tenantID, staffID, roleID, strings.TrimSpace(req.Name), strings.TrimSpace(req.Email))
	if err != nil {
		return nil, err
	}

	role, _ := s.repo.GetStaffRoleByID(ctx, tenantID, roleID)
	metadata, _ := json.Marshal(map[string]any{
		"name":  updated.Name,
		"email": updated.Email,
		"role": func() string {
			if role != nil {
				return role.Name
			}
			return "staff"
		}(),
	})
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     tenantID,
		ActorUserID:  &actorUserID,
		Action:       "update_staff",
		ResourceType: "user",
		ResourceID:   &staffID,
		Metadata:     metadata,
		CreatedAt:    time.Now().UTC(),
	})
	return updated, nil
}

func (s *Service) DeleteStaff(ctx context.Context, actorUserID uuid.UUID, tenantID, staffID uuid.UUID) error {
	if actorUserID == staffID {
		return errors.New("akun sendiri tidak bisa dihapus")
	}

	target, _, err := s.repo.GetUserByID(ctx, staffID)
	if err != nil {
		return err
	}
	if target == nil || target.TenantID != tenantID || target.Role != "staff" {
		return errors.New("pegawai tidak ditemukan")
	}

	if err := s.repo.DeleteStaff(ctx, tenantID, staffID); err != nil {
		return err
	}

	metadata, _ := json.Marshal(map[string]any{
		"name":  target.Name,
		"email": target.Email,
		"role":  target.Role,
	})
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     tenantID,
		ActorUserID:  &actorUserID,
		Action:       "delete_staff",
		ResourceType: "user",
		ResourceID:   &staffID,
		Metadata:     metadata,
		CreatedAt:    time.Now().UTC(),
	})

	return nil
}

func (s *Service) ListActivity(ctx context.Context, tenantID uuid.UUID, limit int) ([]AuditLogEntry, error) {
	return s.repo.ListAuditLogsByTenant(ctx, tenantID, limit)
}

func (s *Service) GetStaffPermissions(ctx context.Context, tenantID, staffID uuid.UUID) ([]string, error) {
	staff, _, err := s.repo.GetUserByID(ctx, staffID)
	if err != nil || staff == nil || staff.TenantID != tenantID || staff.RoleID == nil {
		return []string{}, err
	}
	role, err := s.repo.GetStaffRoleByID(ctx, tenantID, *staff.RoleID)
	if err != nil || role == nil {
		return []string{}, err
	}
	return []string(role.PermissionKeys), nil
}

func (s *Service) UpdateStaffPermissions(ctx context.Context, tenantID, staffID uuid.UUID, permissions []string) error {
	return errors.New("edit permission langsung tidak didukung; gunakan role")
}

// GetUserByID sekarang me-return DTO yang diminta oleh auth handler
// Gunakan alias atau mapping manual
func (s *Service) GetUserByID(ctx context.Context, id uuid.UUID) (*auth.CheckMeUserResponse, error) {
	u, logo, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, nil
	}

	permissionKeys := []string{}
	if u.RoleID != nil && u.Role == "staff" {
		if role, err := s.repo.GetStaffRoleByID(ctx, u.TenantID, *u.RoleID); err == nil && role != nil {
			permissionKeys = []string(role.PermissionKeys)
		}
	}

	// Mapping data termasuk LogoURL
	return &auth.CheckMeUserResponse{
		ID:             u.ID,
		TenantID:       u.TenantID,
		Name:           u.Name,
		Email:          u.Email,
		Role:           u.Role,
		LogoURL:        logo, // Data hasil JOIN tadi
		PermissionKeys: permissionKeys,
	}, nil
}

func sanitizePermissions(values []string) []string {
	seen := make(map[string]struct{})
	out := make([]string, 0, len(values))
	for _, value := range values {
		key := strings.TrimSpace(value)
		if key == "" {
			continue
		}
		if _, allowed := AllowedPermissionKeys[key]; !allowed {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, key)
	}
	return out
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func firstStringSlice(values ...[]string) []string {
	for _, value := range values {
		if len(value) == 0 {
			continue
		}
		out := make([]string, 0, len(value))
		seen := map[string]struct{}{}
		for _, item := range value {
			trimmed := strings.TrimSpace(item)
			if trimmed == "" {
				continue
			}
			if _, exists := seen[trimmed]; exists {
				continue
			}
			seen[trimmed] = struct{}{}
			out = append(out, trimmed)
		}
		if len(out) > 0 {
			return out
		}
	}
	return []string{}
}

func cloneStringSlice(values []string) []string {
	if len(values) == 0 {
		return []string{}
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		out = append(out, trimmed)
	}
	return out
}

func appendUniqueStrings(values []string, extras ...string) []string {
	out := cloneStringSlice(values)
	seen := map[string]struct{}{}
	for _, value := range out {
		seen[strings.ToLower(value)] = struct{}{}
	}
	for _, extra := range extras {
		trimmed := strings.TrimSpace(extra)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

func labelForPostType(postType string) string {
	switch strings.ToLower(strings.TrimSpace(postType)) {
	case "video":
		return "Video"
	case "promo":
		return "Promo"
	case "update":
		return "Update"
	default:
		return "Foto"
	}
}

func promoWindowActive(start, end *time.Time, now time.Time) bool {
	if start != nil && now.Before(*start) {
		return false
	}
	if end != nil && now.After(*end) {
		return false
	}
	return true
}

func discoveryRank(item TenantDirectoryItem) int {
	score := item.DiscoveryPriority * 80
	score += discoveryBehaviorScore(item)
	score += discoveryQualityScore(item)
	if item.IsFeatured {
		score += 40
	}
	if item.IsPromoted {
		score += 25
	}
	if item.IsNew {
		score += 15
	}
	if item.ResourceCount >= 5 {
		score += 10
	}
	if item.StartingPrice > 0 && item.StartingPrice <= 100000 {
		score += 5
	}
	return score
}

func shouldAutoFeature(item TenantDirectoryItem, entry TenantDirectoryItem) bool {
	return entry.IsNew ||
		entry.IsPromoted ||
		item.ResourceCount >= 5 ||
		(item.DiscoveryClicks30d >= 8 && item.DiscoveryCtr30d >= 4)
}

func shouldAutoPromote(item TenantDirectoryItem) bool {
	return item.StartingPrice > 0 && item.ResourceCount >= 3 ||
		(item.DiscoveryClicks30d >= 6 && item.DiscoveryCtr30d >= 3)
}

func discoveryBehaviorScore(item TenantDirectoryItem) int {
	score := 0
	if item.DiscoveryImpressions30d >= 25 {
		score += 6
	}
	if item.DiscoveryClicks30d >= 5 {
		score += 12
	}
	if item.DiscoveryClicks30d >= 10 {
		score += 8
	}
	if item.DiscoveryCtr30d >= 2 {
		score += 8
	}
	if item.DiscoveryCtr30d >= 5 {
		score += 14
	}
	return score
}

func discoveryQualityScore(item TenantDirectoryItem) int {
	score := 0
	if strings.TrimSpace(item.FeaturedImageURL) != "" || strings.TrimSpace(item.BannerURL) != "" {
		score += 6
	}
	if strings.TrimSpace(item.LogoURL) != "" {
		score += 4
	}
	if len(item.DiscoveryTags) >= 2 {
		score += 4
	}
	if len(item.DiscoveryBadges) >= 1 {
		score += 4
	}
	if item.ResourceCount >= 3 {
		score += 6
	}
	if item.ResourceCount >= 6 {
		score += 6
	}
	if item.StartingPrice > 0 && item.StartingPrice <= 150000 {
		score += 3
	}
	if closesLate(item.CloseTime) {
		score += 3
	}
	return score
}

func scorePersonalization(item TenantDirectoryItem, signals *CustomerDiscoverySignals) (int, string) {
	score := 0
	reasons := []string{}

	categoryKey := strings.ToLower(strings.TrimSpace(item.BusinessCategory))
	typeKey := strings.ToLower(strings.TrimSpace(item.BusinessType))

	if visits := signals.VisitedTenants[item.ID]; visits > 0 {
		score += 28 + minInt(visits, 4)*6
		reasons = append(reasons, "Kamu pernah booking di sini")
	}

	if hits := signals.FavoriteCategories[categoryKey]; hits > 0 {
		score += 12 + minInt(hits, 4)*4
		if pretty := prettifyLabel(item.BusinessCategory); pretty != "" {
			reasons = append(reasons, fmt.Sprintf("Selaras dengan minat kamu di %s", pretty))
		}
	}

	if hits := signals.FavoriteTypes[typeKey]; hits > 0 {
		score += 8 + minInt(hits, 3)*3
		reasons = append(reasons, "Mirip dengan tipe tempat yang sering kamu pilih")
	}

	if signals.AverageSpend > 0 && item.StartingPrice > 0 {
		switch {
		case item.StartingPrice <= signals.AverageSpend*0.3:
			score += 10
			reasons = append(reasons, "Masih masuk ke gaya budget booking kamu")
		case item.StartingPrice <= signals.AverageSpend*0.55:
			score += 6
		}
	}

	if signals.EveningBookings >= 2 && closesLate(item.CloseTime) {
		score += 8
		reasons = append(reasons, "Cocok untuk pola booking kamu di sore atau malam")
	}

	if item.IsNew {
		score += 4
	}

	if len(reasons) == 0 {
		if item.DiscoveryCtr30d >= 5 {
			return score + 6, "Sedang menarik perhatian customer lain"
		}
		if item.ResourceCount >= 4 {
			return score + 4, "Punya pilihan resource yang lebih lengkap"
		}
		return score, ""
	}

	return score, reasons[0]
}

func filterDiscoveryItems(items []TenantDirectoryItem, keep func(TenantDirectoryItem) bool, limit int) []TenantDirectoryItem {
	out := make([]TenantDirectoryItem, 0, limit)
	for _, item := range items {
		if !keep(item) {
			continue
		}
		out = append(out, item)
		if len(out) >= limit {
			break
		}
	}
	return out
}

func normalizeTenantPostReq(req TenantPostUpsertReq) (TenantPost, error) {
	postType := strings.ToLower(strings.TrimSpace(req.Type))
	if postType == "" {
		postType = "photo"
	}
	switch postType {
	case "photo", "video", "promo", "update":
	default:
		return TenantPost{}, errors.New("tipe postingan tidak valid")
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		return TenantPost{}, errors.New("judul postingan wajib diisi")
	}

	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status == "" {
		status = "draft"
	}
	switch status {
	case "draft", "scheduled", "published":
	default:
		return TenantPost{}, errors.New("status postingan tidak valid")
	}

	visibility := strings.ToLower(strings.TrimSpace(req.Visibility))
	if visibility == "" {
		visibility = "feed"
	}
	switch visibility {
	case "feed", "highlight", "private":
	default:
		return TenantPost{}, errors.New("visibility postingan tidak valid")
	}

	metadata, err := normalizeTenantPostMetadata(
		req.Metadata,
		postType,
		strings.TrimSpace(req.CoverMediaURL),
		strings.TrimSpace(req.ThumbnailURL),
	)
	if err != nil {
		return TenantPost{}, err
	}

	return TenantPost{
		Type:          postType,
		Title:         title,
		Caption:       strings.TrimSpace(req.Caption),
		CoverMediaURL: strings.TrimSpace(req.CoverMediaURL),
		ThumbnailURL:  strings.TrimSpace(req.ThumbnailURL),
		CTA:           strings.TrimSpace(req.CTA),
		Status:        status,
		Visibility:    visibility,
		StartsAt:      req.StartsAt,
		EndsAt:        req.EndsAt,
		Metadata:      metadata,
	}, nil
}

func normalizeTenantPostMetadata(
	raw json.RawMessage,
	postType string,
	coverMediaURL string,
	thumbnailURL string,
) (json.RawMessage, error) {
	meta := parseTenantPostMediaMetadata(raw)
	meta.PosterURL = firstNonEmpty(strings.TrimSpace(meta.PosterURL), thumbnailURL, coverMediaURL)
	meta.MIMEType = firstNonEmpty(strings.TrimSpace(meta.MIMEType), inferMediaMIMEType(postType, coverMediaURL))
	meta.StreamURLHLS = strings.TrimSpace(meta.StreamURLHLS)
	if meta.DurationSeconds < 0 {
		meta.DurationSeconds = 0
	}
	if meta.Width < 0 {
		meta.Width = 0
	}
	if meta.Height < 0 {
		meta.Height = 0
	}
	normalized, err := json.Marshal(meta)
	if err != nil {
		return nil, errors.New("metadata media tidak valid")
	}
	return normalized, nil
}

func parseTenantPostMediaMetadata(raw json.RawMessage) TenantPostMediaMetadata {
	if len(raw) == 0 {
		return TenantPostMediaMetadata{}
	}
	var meta TenantPostMediaMetadata
	if err := json.Unmarshal(raw, &meta); err != nil {
		return TenantPostMediaMetadata{}
	}
	return meta
}

func inferMediaMIMEType(postType string, mediaURL string) string {
	lowerURL := strings.ToLower(strings.TrimSpace(mediaURL))
	if idx := strings.Index(lowerURL, "?"); idx >= 0 {
		lowerURL = lowerURL[:idx]
	}
	switch {
	case strings.HasSuffix(lowerURL, ".m3u8"):
		return "application/x-mpegURL"
	case strings.HasSuffix(lowerURL, ".mp4"):
		return "video/mp4"
	case strings.HasSuffix(lowerURL, ".webm"):
		return "video/webm"
	case strings.HasSuffix(lowerURL, ".mov"):
		return "video/quicktime"
	case strings.HasSuffix(lowerURL, ".png"):
		return "image/png"
	case strings.HasSuffix(lowerURL, ".webp"):
		return "image/webp"
	case strings.HasSuffix(lowerURL, ".gif"):
		return "image/gif"
	case strings.HasSuffix(lowerURL, ".jpg"), strings.HasSuffix(lowerURL, ".jpeg"):
		return "image/jpeg"
	}
	if strings.EqualFold(strings.TrimSpace(postType), "video") {
		return "video/mp4"
	}
	return "image/jpeg"
}

func derivePublishedAt(status string, now time.Time) *time.Time {
	if status != "published" {
		return nil
	}
	publishedAt := now
	return &publishedAt
}
