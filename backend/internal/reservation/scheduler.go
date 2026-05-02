package reservation

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/fonnte"
	"github.com/jmoiron/sqlx"
)

type Scheduler struct {
	db        *sqlx.DB
	repo      *Repository
	deviceSvc deviceAutomation
	stopChan  chan struct{}
}

type sessionJob struct {
	ID            string    `db:"id"`
	TenantID      string    `db:"tenant_id"`
	CustomerID    string    `db:"customer_id"`
	CustomerName  string    `db:"customer_name"`
	CustomerPhone string    `db:"customer_phone"`
	ResourceName  string    `db:"resource_name"`
	ResourceID    string    `db:"resource_id"`
	StartTime     time.Time `db:"start_time"`
	EndTime       time.Time `db:"end_time"`
	AccessToken   string    `db:"access_token"`
	Status        string    `db:"status"`
}

func NewScheduler(db *sqlx.DB, repo *Repository, deviceSvc deviceAutomation) *Scheduler {
	return &Scheduler{
		db:        db,
		repo:      repo,
		deviceSvc: deviceSvc,
		stopChan:  make(chan struct{}),
	}
}

func (s *Scheduler) Start() {
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		s.runOnce(context.Background())
		for {
			select {
			case <-ticker.C:
				s.runOnce(context.Background())
			case <-s.stopChan:
				return
			}
		}
	}()
}

func (s *Scheduler) Stop() {
	close(s.stopChan)
}

func (s *Scheduler) runOnce(ctx context.Context) {
	now := time.Now().UTC()

	var jobs []sessionJob
	err := s.db.SelectContext(ctx, &jobs, `
		SELECT b.id, b.tenant_id, c.name AS customer_name, c.phone AS customer_phone,
			b.customer_id, res.name AS resource_name, b.resource_id, b.start_time, b.end_time, b.access_token,
			b.status
		FROM bookings b
		JOIN customers c ON c.id = b.customer_id
		JOIN resources res ON res.id = b.resource_id
		WHERE b.status IN ('pending', 'confirmed', 'active', 'ongoing')
		  AND b.status != 'cancelled'
		  AND b.end_time > ($1::timestamptz - INTERVAL '1 minute')
		ORDER BY b.start_time ASC`,
		now,
	)
	if err != nil {
		log.Printf("[SCHEDULER] query failed: %v", err)
		return
	}

	for _, job := range jobs {
		startIn := job.StartTime.Sub(now)
		endIn := job.EndTime.Sub(now)

		if job.Status == "pending" || job.Status == "confirmed" {
			if startIn <= 20*time.Minute && startIn > 19*time.Minute {
				if err := s.sendReminder(job, 20); err == nil {
					_ = s.repo.MarkReminderSent(ctx, mustParseUUID(job.ID), mustParseUUID(job.TenantID), "reminder_20m_sent_at")
				}
			}
			if startIn <= 5*time.Minute && startIn > 4*time.Minute {
				if err := s.sendReminder(job, 5); err == nil {
					_ = s.repo.MarkReminderSent(ctx, mustParseUUID(job.ID), mustParseUUID(job.TenantID), "reminder_5m_sent_at")
				}
			}
		}

		if s.deviceSvc == nil {
			continue
		}
		if (job.Status == "active" || job.Status == "ongoing") && endIn <= 5*time.Minute && endIn > 4*time.Minute {
			_ = s.deviceSvc.EnqueueWarning(ctx, job.TenantID, job.ID)
		}
		if (job.Status == "active" || job.Status == "ongoing") && endIn <= 0 && endIn > -1*time.Minute {
			_ = s.deviceSvc.EnqueueTimeout(ctx, job.TenantID, job.ID)
			_ = s.deviceSvc.EnqueueStandbyByResource(ctx, job.TenantID, job.ResourceID)
		}
	}
}

func (s *Scheduler) sendReminder(job sessionJob, minutes int) error {
	tenantSlug, err := s.repo.GetTenantSlug(context.Background(), mustParseUUID(job.TenantID))
	if err != nil {
		tenantSlug = "tenant"
	}
	url := bookingVerifyURL(tenantSlug, job.AccessToken)

	loc, lerr := time.LoadLocation("Asia/Jakarta")
	if lerr != nil {
		loc = time.FixedZone("WIB", 7*60*60)
	}

	msg := fmt.Sprintf(
		"⏳ *Reminder: %d Menit Lagi!*\n\n"+
			"Halo *%s*, sesi booking kamu untuk *%s* mulai *%d menit lagi* (%s).\n\n"+
			"Buka detail booking:\n%s",
		minutes,
		job.CustomerName,
		job.ResourceName,
		minutes,
		job.StartTime.In(loc).Format("02 Jan 2006, 15:04 WIB"),
		url,
	)
	_, sendErr := fonnte.SendMessage(job.CustomerPhone, msg)
	return sendErr
}

func mustParseUUID(v string) uuid.UUID {
	id, err := uuid.Parse(v)
	if err != nil {
		return uuid.Nil
	}
	return id
}
