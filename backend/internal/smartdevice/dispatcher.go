package smartdevice

import (
	"context"
	"log"
	"time"
)

type Dispatcher struct {
	repo      *Repository
	publisher Publisher
	stopChan  chan struct{}
}

func NewDispatcher(repo *Repository, publisher Publisher) *Dispatcher {
	return &Dispatcher{
		repo:      repo,
		publisher: publisher,
		stopChan:  make(chan struct{}),
	}
}

func (d *Dispatcher) Start() {
	if d == nil {
		return
	}
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		d.runOnce(context.Background())
		for {
			select {
			case <-ticker.C:
				d.runOnce(context.Background())
			case <-d.stopChan:
				return
			}
		}
	}()
}

func (d *Dispatcher) Stop() {
	if d == nil {
		return
	}
	close(d.stopChan)
}

func (d *Dispatcher) runOnce(ctx context.Context) {
	if d.publisher == nil || !d.publisher.IsConnected() {
		return
	}
	commands, err := d.repo.ClaimDueCommands(ctx, 20)
	if err != nil {
		log.Printf("[SMARTDEVICE][DISPATCHER] claim due commands failed: %v", err)
		return
	}
	for _, command := range commands {
		publishCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		err := d.publisher.Publish(publishCtx, command.CommandTopic, byte(command.QoS), command.Retain, command.Payload)
		cancel()
		if err != nil {
			retryAt := time.Now().UTC().Add(30 * time.Second)
			_ = d.repo.MarkCommandRetry(ctx, command.ID, err.Error(), command.PublishAttempts+1, retryAt)
			_ = d.repo.InsertEvent(ctx, command.DeviceID, &command.TenantID, nil, "system", "command.retry", "Command retry dijadwalkan", "Publish ke broker gagal dan command akan dicoba ulang.", map[string]any{"command_id": command.ID, "error": err.Error()})
			continue
		}
		_ = d.repo.MarkCommandPublished(ctx, command.ID)
		_ = d.repo.InsertEvent(ctx, command.DeviceID, &command.TenantID, nil, "system", "command.sent", "Command terkirim", "Command otomatis berhasil dipublish ke broker.", map[string]any{"command_id": command.ID, "trigger_event": command.TriggerEvent})
	}
}
