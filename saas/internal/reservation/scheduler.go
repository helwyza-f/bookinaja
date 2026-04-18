package reservation

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/platform/fonnte"
	"github.com/jmoiron/sqlx"
)

type Scheduler struct {
	db       *sqlx.DB
	repo     *Repository
	stopChan chan struct{}
}

type sessionJob struct {
	ID                string     `db:"id"`
	TenantID          string     `db:"tenant_id"`
	CustomerID        string     `db:"customer_id"`
	CustomerName      string     `db:"customer_name"`
	CustomerPhone     string     `db:"customer_phone"`
	ResourceName      string     `db:"resource_name"`
	StartTime         time.Time  `db:"start_time"`
	EndTime           time.Time  `db:"end_time"`
	AccessToken       string     `db:"access_token"`
	Status            string     `db:"status"`
}

func NewScheduler(db *sqlx.DB, repo *Repository) *Scheduler {
	return &Scheduler{
		db:       db,
		repo:     repo,
		stopChan: make(chan struct{}),
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
			b.customer_id, res.name AS resource_name, b.start_time, b.end_time, b.access_token,
			b.status
		FROM bookings b
		JOIN customers c ON c.id = b.customer_id
		JOIN resources res ON res.id = b.resource_id
		WHERE b.status IN ('pending', 'active', 'ongoing')
		  AND b.status != 'cancelled'
		  AND b.end_time > $1
		ORDER BY b.start_time ASC`,
		now,
	)
	if err != nil {
		log.Printf("[SCHEDULER] query failed: %v", err)
		return
	}

	for _, job := range jobs {
		startIn := job.StartTime.Sub(now)

		if (job.Status == "pending" || job.Status == "confirmed") && !now.Before(job.StartTime) {
			bID := mustParseUUID(job.ID)
			tID := mustParseUUID(job.TenantID)
			if err := s.repo.UpdateStatus(ctx, bID, tID, "active"); err != nil {
				log.Printf("[SCHEDULER] activate failed booking=%s: %v", job.ID, err)
				continue
			}
			_ = s.repo.UpdateSessionActivatedAt(ctx, bID, tID)
			_ = s.sendSessionStarted(job)
			continue
		}

		if job.Status != "pending" && job.Status != "confirmed" {
			continue
		}

		if startIn <= 20*time.Minute && startIn > 19*time.Minute {
			_ = s.sendReminder(job, 20)
		}
		if startIn <= 5*time.Minute && startIn > 4*time.Minute {
			_ = s.sendReminder(job, 5)
		}
	}
}

func (s *Scheduler) sendReminder(job sessionJob, minutes int) error {
	base := strings.TrimRight(strings.TrimSpace(os.Getenv("NEXT_PUBLIC_APP_URL")), "/")
	if base == "" {
		base = "http://localhost:3000"
	}
	msg := fmt.Sprintf(
		"Halo %s, sesi booking kamu untuk %s mulai %d menit lagi pada %s.\n\nBuka detail booking:\n%s/me/bookings/%s?token=%s",
		job.CustomerName,
		job.ResourceName,
		minutes,
		job.StartTime.In(time.Local).Format("02 Jan 2006 15:04"),
		base,
		job.ID,
		safeCustomerSessionToken(job.CustomerID, job.TenantID),
	)
	_, err := fonnte.SendMessage(job.CustomerPhone, msg)
	return err
}

func (s *Scheduler) sendSessionStarted(job sessionJob) error {
	base := strings.TrimRight(strings.TrimSpace(os.Getenv("NEXT_PUBLIC_APP_URL")), "/")
	if base == "" {
		base = "http://localhost:3000"
	}
	msg := fmt.Sprintf(
		"Halo %s, sesi booking kamu untuk %s sekarang sudah aktif.\n\nBuka detail booking:\n%s/me/bookings/%s?token=%s",
		job.CustomerName,
		job.ResourceName,
		base,
		job.ID,
		safeCustomerSessionToken(job.CustomerID, job.TenantID),
	)
	_, err := fonnte.SendMessage(job.CustomerPhone, msg)
	return err
}

func mustParseUUID(v string) uuid.UUID {
	id, err := uuid.Parse(v)
	if err != nil {
		return uuid.Nil
	}
	return id
}

func safeCustomerSessionToken(customerID, tenantID string) string {
	token, err := generateCustomerSessionToken(customerID, tenantID)
	if err != nil {
		return ""
	}
	return token
}
