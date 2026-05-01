FROM golang:1.24-alpine AS builder
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY cmd ./cmd
COPY internal ./internal
COPY migrations ./migrations

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/main ./cmd/api/main.go

FROM alpine:latest
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app

COPY --from=builder /out/main ./main
COPY --from=builder /src/migrations ./migrations
COPY --from=builder /src/internal ./internal

EXPOSE 8080
CMD ["./main"]
