package smartdevice

import (
	"context"
	"log"
	"time"
)

type Reconciler struct {
	service    *Service
	stopChan   chan struct{}
	staleAfter time.Duration
}

func NewReconciler(service *Service, staleAfter time.Duration) *Reconciler {
	if staleAfter <= 0 {
		staleAfter = 90 * time.Second
	}
	return &Reconciler{
		service:    service,
		stopChan:   make(chan struct{}),
		staleAfter: staleAfter,
	}
}

func (r *Reconciler) Start() {
	if r == nil || r.service == nil {
		return
	}
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		r.runOnce(context.Background())
		for {
			select {
			case <-ticker.C:
				r.runOnce(context.Background())
			case <-r.stopChan:
				return
			}
		}
	}()
}

func (r *Reconciler) Stop() {
	if r == nil {
		return
	}
	close(r.stopChan)
}

func (r *Reconciler) runOnce(ctx context.Context) {
	if err := r.service.ReconcileHeartbeats(ctx, r.staleAfter); err != nil {
		log.Printf("[SMARTDEVICE][RECONCILER] heartbeat reconcile failed: %v", err)
	}
}
