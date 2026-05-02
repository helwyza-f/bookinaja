FROM alpine:latest
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app

COPY main ./main
COPY emqxsl-ca.crt ./emqxsl-ca.crt
COPY migrations ./migrations
COPY internal ./internal

EXPOSE 8080
CMD ["./main"]
