module github.com/phgp/v2x-gateway-rsu

go 1.25.6

require (
	google.golang.org/grpc v1.61.0
	google.golang.org/protobuf v1.32.0
	go.opentelemetry.io/otel v1.22.0
	go.opentelemetry.io/otel/sdk v1.22.0
	go.opentelemetry.io/otel/exporters/otlp/otlptrace v1.22.0
	go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc v1.22.0
	go.opentelemetry.io/otel/exporters/prometheus v0.44.0
	go.opentelemetry.io/otel/metric v1.22.0
	go.opentelemetry.io/otel/trace v1.22.0
	github.com/prometheus/client_golang v1.18.0
)

require (
	github.com/golang/protobuf v1.5.3 // indirect
	golang.org/x/net v0.20.0 // indirect
	golang.org/x/sys v0.16.0 // indirect
	golang.org/x/text v0.14.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240125205218-1f4bbc51befe // indirect
)
