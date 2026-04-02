FROM alpine:latest
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY main .
COPY migrations ./migrations
EXPOSE 8080
CMD ["./main"]