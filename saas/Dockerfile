FROM alpine:latest
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app

# Copy binary
COPY main .

# Copy folder migrations (untuk DB)
COPY migrations ./migrations

# PENTING: Copy folder internal agar templates.json bisa dibaca saat runtime
COPY internal ./internal 


EXPOSE 8080
CMD ["./main"]