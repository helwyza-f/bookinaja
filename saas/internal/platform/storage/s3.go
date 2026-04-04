package storage

import (
	"context"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type S3Client struct {
	client *s3.Client
	bucket string
	region string
}

func NewS3Client() (*S3Client, error) {
	region := os.Getenv("AWS_REGION")
	bucket := os.Getenv("AWS_BUCKET")

	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config, %v", err)
	}

	return &S3Client{
		client: s3.NewFromConfig(cfg),
		bucket: bucket,
		region: region,
	}, nil
}

// UploadFile mengupload satu file ke S3
func (s *S3Client) UploadFile(ctx context.Context, file *multipart.FileHeader, folder string) (string, error) {
	f, err := file.Open()
	if err != nil {
		return "", err
	}
	defer f.Close()

	fileExt := filepath.Ext(file.Filename)
	fileName := strings.TrimSuffix(file.Filename, fileExt)
	newFileName := fmt.Sprintf("%s/%s-%s%s", folder, uuid.New().String(), fileName, fileExt)

	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(newFileName),
		Body:        f,
		ContentType: aws.String(file.Header.Get("Content-Type")),
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload object, %v", err)
	}

	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucket, s.region, newFileName)
	return url, nil
}

// UploadBulk mengupload banyak file sekaligus secara paralel
func (s *S3Client) UploadBulk(ctx context.Context, files []*multipart.FileHeader, folder string) ([]string, error) {
	var wg sync.WaitGroup
	results := make(chan string, len(files))
	errors := make(chan error, len(files))

	for _, file := range files {
		wg.Add(1)
		go func(f *multipart.FileHeader) {
			defer wg.Done()
			// Re-use fungsi UploadFile yang sudah ada
			url, err := s.UploadFile(ctx, f, folder)
			if err != nil {
				errors <- err
				return
			}
			results <- url
		}(file)
	}

	// Tunggu semua goroutine selesai di background
	go func() {
		wg.Wait()
		close(results)
		close(errors)
	}()

	var urls []string
	for url := range results {
		urls = append(urls, url)
	}

	// Cek jika ada error (opsional: bisa return partial results atau error langsung)
	if len(errors) > 0 {
		return urls, <-errors
	}

	return urls, nil
}