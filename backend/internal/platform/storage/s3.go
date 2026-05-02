package storage

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type S3Client struct {
	client    *s3.Client
	presign   *s3.PresignClient
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
		presign:   s3.NewPresignClient(client),
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

func (s *S3Client) UploadReader(ctx context.Context, body io.Reader, objectKey string, contentType string) (string, error) {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(objectKey),
		Body:        body,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to R2, %v", err)
	}

	return fmt.Sprintf("%s/%s", s.publicURL, objectKey), nil
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

func (s *S3Client) PublicURLForKey(objectKey string) string {
	return fmt.Sprintf("%s/%s", s.publicURL, objectKey)
}

func (s *S3Client) CreateMultipartUpload(ctx context.Context, objectKey string, contentType string) (string, error) {
	result, err := s.client.CreateMultipartUpload(ctx, &s3.CreateMultipartUploadInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(objectKey),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed to create multipart upload, %v", err)
	}
	return aws.ToString(result.UploadId), nil
}

func (s *S3Client) PresignPutObject(ctx context.Context, objectKey string, contentType string) (string, error) {
	result, err := s.presign.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(objectKey),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed to presign put object, %v", err)
	}
	return result.URL, nil
}

func (s *S3Client) PresignUploadPart(ctx context.Context, objectKey string, uploadID string, partNumber int32) (string, error) {
	result, err := s.presign.PresignUploadPart(ctx, &s3.UploadPartInput{
		Bucket:     aws.String(s.bucket),
		Key:        aws.String(objectKey),
		UploadId:   aws.String(uploadID),
		PartNumber: aws.Int32(partNumber),
	})
	if err != nil {
		return "", fmt.Errorf("failed to presign upload part, %v", err)
	}
	return result.URL, nil
}

func (s *S3Client) CompleteMultipartUpload(ctx context.Context, objectKey string, uploadID string, parts []types.CompletedPart) error {
	_, err := s.client.CompleteMultipartUpload(ctx, &s3.CompleteMultipartUploadInput{
		Bucket:   aws.String(s.bucket),
		Key:      aws.String(objectKey),
		UploadId: aws.String(uploadID),
		MultipartUpload: &types.CompletedMultipartUpload{
			Parts: parts,
		},
	})
	if err != nil {
		return fmt.Errorf("failed to complete multipart upload, %v", err)
	}
	return nil
}

func (s *S3Client) AbortMultipartUpload(ctx context.Context, objectKey string, uploadID string) error {
	_, err := s.client.AbortMultipartUpload(ctx, &s3.AbortMultipartUploadInput{
		Bucket:   aws.String(s.bucket),
		Key:      aws.String(objectKey),
		UploadId: aws.String(uploadID),
	})
	if err != nil {
		return fmt.Errorf("failed to abort multipart upload, %v", err)
	}
	return nil
}
