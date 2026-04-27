package storage

import (
	"context"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"

	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type S3Client struct {
    client    *s3.Client
    bucket    string
    publicURL string
}

func NewS3Client() (*S3Client, error) {
    bucket := os.Getenv("AWS_BUCKET")
    publicURL := os.Getenv("R2_PUBLIC_URL")

    // 1. Setup Kredensial R2 secara eksplisit
    cfg, err := config.LoadDefaultConfig(context.TODO(),
        config.WithRegion("auto"),
        config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
            os.Getenv("AWS_ACCESS_KEY_ID"),
            os.Getenv("AWS_SECRET_ACCESS_KEY"),
            "",
        )),
    )
    if err != nil {
        return nil, fmt.Errorf("unable to load SDK config, %v", err)
    }

    // 2. Override Endpoint ke Cloudflare
    client := s3.NewFromConfig(cfg, func(o *s3.Options) {
        o.BaseEndpoint = aws.String(os.Getenv("R2_ENDPOINT"))
    })

    return &S3Client{
        client:    client,
        bucket:    bucket,
        publicURL: publicURL,
    }, nil
}

func (s *S3Client) UploadFile(ctx context.Context, file *multipart.FileHeader, folder string) (string, error) {
    f, err := file.Open()
    if err != nil {
        return "", err
    }
    defer f.Close()

    fileExt := filepath.Ext(file.Filename)
    newFileName := fmt.Sprintf("%s/%s%s", folder, uuid.New().String(), fileExt)

    _, err = s.client.PutObject(ctx, &s3.PutObjectInput{
        Bucket:      aws.String(s.bucket),
        Key:         aws.String(newFileName),
        Body:        f,
        ContentType: aws.String(file.Header.Get("Content-Type")),
    })

    if err != nil {
        return "", fmt.Errorf("failed to upload to R2, %v", err)
    }

    // 3. Kembalikan URL menggunakan Custom Domain CDN
    return fmt.Sprintf("%s/%s", s.publicURL, newFileName), nil
}

func (s *S3Client) UploadBulk(ctx context.Context, files []*multipart.FileHeader, folder string) ([]string, error) {
    var wg sync.WaitGroup
    results := make(chan string, len(files))
    errors := make(chan error, len(files))

    for _, file := range files {
        wg.Add(1)
        go func(f *multipart.FileHeader) {
            defer wg.Done()
            url, err := s.UploadFile(ctx, f, folder)
            if err != nil {
                errors <- err
                return
            }
            results <- url
        }(file)
    }

    go func() {
        wg.Wait()
        close(results)
        close(errors)
    }()

    var urls []string
    for url := range results {
        urls = append(urls, url)
    }

    if len(errors) > 0 {
        return urls, <-errors
    }

    return urls, nil
}