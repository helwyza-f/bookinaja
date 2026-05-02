package smartdevice

import (
	"context"
	"log"
)

type BrokerSubscriber interface {
	Subscribe(ctx context.Context, topic string, qos byte, handler func(topic string, payload []byte)) error
}

type Subscriber struct {
	service *Service
	broker  BrokerSubscriber
}

func NewSubscriber(service *Service, broker BrokerSubscriber) *Subscriber {
	return &Subscriber{
		service: service,
		broker:  broker,
	}
}

func (s *Subscriber) Start(ctx context.Context) error {
	if s == nil || s.service == nil || s.broker == nil {
		return nil
	}
	if err := s.broker.Subscribe(ctx, "bookinaja/devices/+/state", 1, func(topic string, payload []byte) {
		if err := s.service.HandleStateMessage(context.Background(), topic, payload); err != nil {
			log.Printf("[SMARTDEVICE][SUBSCRIBER] state handler failed: %v", err)
		}
	}); err != nil {
		return err
	}
	if err := s.broker.Subscribe(ctx, "bookinaja/devices/+/ack", 1, func(topic string, payload []byte) {
		if err := s.service.HandleAckMessage(context.Background(), topic, payload); err != nil {
			log.Printf("[SMARTDEVICE][SUBSCRIBER] ack handler failed: %v", err)
		}
	}); err != nil {
		return err
	}
	return nil
}
