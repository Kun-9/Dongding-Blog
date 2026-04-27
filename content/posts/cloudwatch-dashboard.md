---
title: CloudWatch를 통한 Dashboard 구현
summary: AWS CloudWatch로 운영 대시보드를 구성한다.
category: system
tags: []
date: '2025-01-03'
visibility: published
---
# 기본 구조

Container Insight, Fluent-Bit, CloudWatch Agent, CloudWatch Metrics

# Container Insights

## Container Insights의 역할

- 클러스터 수준의 모니터링 솔루션
- CloudWatch Agent를 활용하여 메트릭을 수집, 클러스터 DaemonSet 형태로 배포
- 기본적인 컨테이너 메트릭(CPU · MEMORY · NETWORK 등)을 수집
- 성능 데이터를 자동으로 집계하고 구조화

## Container Insights의 기본 ConfigMap

```json
   cwagentconfig.json: |
     {
       "logs": {
         "metrics_collected": {
           "kubernetes": {
             "cluster_name": "my-cluster1",
             "enhanced_container_insights": true,
             "metrics_collection_interval": 60
           }
         },
         "force_flush_interval": 5
       }
     }
```

- enhanced\_container\_insights 옵션이 있다면 더 포괄적인 메트릭을 수집한다.

# CloudWatch Agent

## CloudWatch Agent의 역할

- 주로 메트릭 정보를 수집
- 상세 한 메트릭 정보를 수집할 때 사용
- 성능 위주의 정보

# Fluent-Bit

## Fluent-Bit의 역할

- 로그 형태로 저장
- 경량화된 로그 수집기로, 컨테이너 로그, 시스템 로그, 애플리케이션 로그 등 다양한 소스의 로그를 수집하고 여러 대상(CloudWatch, S3, Elasticsearch 등)으로 전송 가능
- Insight와 함께 사용하면 성능 메트릭을 받아서 Log형태로 수집 가능

```yaml
  # Fluent Bit의 outputs 파트
  # CloudWatch 출력 설정
  outputs: |
    [OUTPUT]
        Name              cloudwatch_logs
        Match             kube.*
        region            ap-northeast-2
        log_group_name    /aws/containerinsights/my-cluster1/application
        log_stream_prefix ${kubernetes['namespace_name']}/${kubernetes['pod_name']}/
        auto_create_group true
        retry_limit       3

    [OUTPUT]
        Name              cloudwatch_logs
        Match             dataplane.*
        region            ap-northeast-2
        log_group_name    /aws/containerinsights/my-cluster1/performance
        log_stream_prefix ${kubernetes['namespace_name']}/${kubernetes['pod_name']}/
        auto_create_group true
        retry_limit       3

    [OUTPUT]
        Name              cloudwatch_logs
        Match             host.*
        region            ap-northeast-2
        log_group_name    /aws/eks/my-cluster1/fluent-bit
        log_stream_prefix ${kubernetes['namespace_name']}/${kubernetes['pod_name']}/
        auto_create_group true
        retry_limit       3
```

### Performance를 Fluent-Bit에서 설정하는 이유
성능 메트릭은 CloudWatch Agent에 의해 두 가지 방식으로 처리됩니다:

1. CloudWatch Metrics로 직접 전송
2. EMF(Embedded Metric Format) 로그로 변환하여 생성

Fluent-Bit의 performance output은 두 번째 방식을 지원합니다.
CloudWatch Agent가 생성한 EMF 로그를 감지해 이를 CloudWatch Logs로 전송하는 역할을 합니다.

로그 형태로도 저장하는 이유는 다음과 같습니다:

- 로그 기반 메트릭은 장기 보관에 더 비용 효율적입니다.
- 상세한 메타데이터를 포함할 수 있습니다.
- CloudWatch Logs Insights를 활용해 쿼리 분석이 가능합니다.

> [!NOTE]
> 시각화와 상세분석 — 각각 다른 용도로 활용 가능.

# EMF 전송 방식의 대시보드 작동 흐름

![EMF 방식 작동 흐름](/posts/cloudwatch-dashboard/image.png)
