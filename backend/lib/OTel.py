import pathway as pw
import json
from typing import Optional, Any

class Span(pw.Schema):
    # Span identity fields
    trace_id: str  # Required, must be non-empty
    span_id: str  # Required, must be non-empty
    parent_span_id: Optional[str]  # Optional - empty for root spans
    
    # Span metadata
    name: str  # Required
    kind: int  # Default 0 = SPAN_KIND_UNSPECIFIED
    start_time_unix_nano: int  # Required
    end_time_unix_nano: int  # Required
    
    # Optional span fields
    trace_state: Optional[str]  # Optional W3C trace state
    flags: Optional[int]  # Optional bit field
    
    # Status
    status_code: int  # Default 0 = STATUS_CODE_UNSET
    status_message: str
    
    # Span attributes and counters
    attributes: pw.Json  # Flattened span attributes
    dropped_attributes_count: int  # Default 0
    
    # Events (complete nested array)
    events: pw.Json  # Array of Event objects
    dropped_events_count: int  # Default 0
    
    # Links (complete nested array)
    links: pw.Json  # Array of Link objects
    dropped_links_count: int  # Default 0
    
    # Resource fields (flattened attributes as JSON dict)
    resource_attributes: pw.Json
    resource_schema_url: str
    
    # Scope fields (flattened attributes as JSON dict)
    scope_name: str
    scope_version: str
    scope_attributes: pw.Json
    scope_schema_url: str


class Log(pw.Schema):
    # Timestamps
    time_unix_nano: int  # Can be 0 (unknown)
    observed_time_unix_nano: int  # Can be 0 (unknown)
    
    # Severity
    severity_number: int  # Default 0 (SEVERITY_NUMBER_UNSPECIFIED)
    severity_text: str  # Optional, can be empty string
    
    # Log content
    body: Optional[pw.Json]
    
    # Attributes
    log_attributes: pw.Json
    dropped_attributes_count: int  # Default 0
    
    # Optional trace correlation
    trace_id: Optional[str]  # Optional - for correlation
    span_id: Optional[str]  # Optional - for correlation
    
    # Optional event identification
    event_name: str  # Optional, can be empty
    
    # Flags
    flags: Optional[int]  # Optional
    
    # Resource and scope context
    resource_attributes: pw.Json
    resource_schema_url: str
    scope_name: str
    scope_version: str
    scope_attributes: pw.Json
    scope_schema_url: str


class Metric(pw.Schema):
    # Metric metadata
    metric_name: str  # Required
    metric_description: str  # Can be empty
    metric_unit: str  # Can be empty
    metric_type: str  # "gauge", "sum", "histogram", "exponential_histogram", "summary"
    
    # Metric-level metadata (optional)
    metadata: pw.Json  # Optional metric metadata attributes
    
    # Type-specific fields (for Sum and Histogram types)
    aggregation_temporality: Optional[int]  # For Sum and Histogram
    is_monotonic: Optional[bool]  # For Sum only
    
    # All data points as a complete array
    data_points: pw.Json  # Array of data point objects with all fields
    
    # Resource and scope context
    resource_attributes: pw.Json
    resource_schema_url: str
    scope_name: str
    scope_version: str
    scope_attributes: pw.Json
    scope_schema_url: str


def extract_anyvalue(value_obj):
    """Extract the actual value from OTLP AnyValue union"""
    if not value_obj:
        return None
    
    # Check each possible value type
    if "stringValue" in value_obj:
        return value_obj["stringValue"]
    elif "intValue" in value_obj:
        return value_obj["intValue"]
    elif "doubleValue" in value_obj:
        return value_obj["doubleValue"]
    elif "boolValue" in value_obj:
        return value_obj["boolValue"]
    elif "bytesValue" in value_obj:
        return value_obj["bytesValue"]
    elif "arrayValue" in value_obj:
        return [extract_anyvalue(v) for v in value_obj["arrayValue"].get("values", [])]
    elif "kvlistValue" in value_obj:
        return flatten_attributes(value_obj["kvlistValue"].get("values", []))
    
    return None


def flatten_attributes(attributes) -> dict:
    """Convert OTLP KeyValue array to simple dict"""
    if not attributes:
        return {}
    result = {}
    for kv in attributes:
        key = kv.get("key", "")
        value = extract_anyvalue(kv.get("value", {}))
        if key:
            result[key] = value
    return result


def process_span_events(events) -> list[dict]:
    """Process span events into structured format"""
    if not events:
        return []
    
    processed_events = []
    for event in events:
        processed_events.append({
            "time_unix_nano": event.get("timeUnixNano", 0),
            "name": event.get("name", ""),
            "attributes": flatten_attributes(event.get("attributes", [])),
            "dropped_attributes_count": event.get("droppedAttributesCount", 0)
        })
    return processed_events


def process_span_links(links) -> list[dict]:
    """Process span links into structured format"""
    if not links:
        return []
    
    processed_links = []
    for link in links:
        trace_id = link.get("traceId")
        span_id = link.get("spanId")
        
        # Skip invalid links
        if not trace_id or not span_id:
            continue
            
        processed_links.append({
            "trace_id": trace_id,
            "span_id": span_id,
            "trace_state": link.get("traceState"),  # Optional
            "attributes": flatten_attributes(link.get("attributes", [])),
            "dropped_attributes_count": link.get("droppedAttributesCount", 0),
            "flags": link.get("flags")  # Optional
        })
    return processed_links


# Read spans from Kafka
kafka_spans = pw.io.kafka.read(
    rdkafka_settings={
        "bootstrap.servers": "localhost:9092",
        "group.id": "otlp-consumer",
        "auto.offset.reset": "earliest",
    },
    topic="otlp_spans",
    format="plaintext",
)


def flatten_spans(data: str) -> list[dict]:
    """Flatten OTLP spans while preserving events and links as complete objects"""
    traces = json.loads(data)
    flattened = []
    
    for resource_span in traces.get("resourceSpans", []):
        resource = resource_span.get("resource", {})
        resource_attrs = flatten_attributes(resource.get("attributes", []))
        resource_schema = resource_span.get("schemaUrl", "")
        
        for scope_span in resource_span.get("scopeSpans", []):
            scope = scope_span.get("scope", {})
            scope_name = scope.get("name", "")
            scope_version = scope.get("version", "")
            scope_attrs = flatten_attributes(scope.get("attributes", []))
            scope_schema = scope_span.get("schemaUrl", "")
            
            for span in scope_span.get("spans", []):
                # Validate required fields
                trace_id = span.get("traceId")
                if not trace_id:
                    continue  # Skip invalid spans
                
                span_id = span.get("spanId")
                if not span_id:
                    continue  # Skip invalid spans
                
                # Optional parent_span_id (empty for root spans)
                parent_span_id = span.get("parentSpanId") or None
                
                # Process status (optional, defaults to UNSET)
                status = span.get("status", {})
                
                # Process events and links as complete objects
                events = process_span_events(span.get("events", []))
                links = process_span_links(span.get("links", []))
                
                flattened.append({
                    "trace_id": trace_id,
                    "span_id": span_id,
                    "parent_span_id": parent_span_id,
                    "name": span.get("name", ""),
                    "kind": span.get("kind", 0),  # Default SPAN_KIND_UNSPECIFIED
                    "start_time_unix_nano": span.get("startTimeUnixNano", 0),
                    "end_time_unix_nano": span.get("endTimeUnixNano", 0),
                    "trace_state": span.get("traceState"),  # Optional
                    "flags": span.get("flags"),  # Optional
                    "status_code": status.get("code", 0),  # Default STATUS_CODE_UNSET
                    "status_message": status.get("message", ""),
                    "attributes": flatten_attributes(span.get("attributes", [])),
                    "dropped_attributes_count": span.get("droppedAttributesCount", 0),
                    "events": events,
                    "dropped_events_count": span.get("droppedEventsCount", 0),
                    "links": links,
                    "dropped_links_count": span.get("droppedLinksCount", 0),
                    "resource_attributes": resource_attrs,
                    "resource_schema_url": resource_schema,
                    "scope_name": scope_name,
                    "scope_version": scope_version,
                    "scope_attributes": scope_attrs,
                    "scope_schema_url": scope_schema,
                })
    
    return flattened


spans_table = kafka_spans.select(
    flattened=pw.apply(flatten_spans, pw.this.data)
).flatten(pw.this.flattened).select(
    trace_id=pw.this.flattened["trace_id"],
    span_id=pw.this.flattened["span_id"],
    parent_span_id=pw.this.flattened["parent_span_id"],
    name=pw.this.flattened["name"],
    kind=pw.this.flattened["kind"],
    start_time_unix_nano=pw.this.flattened["start_time_unix_nano"],
    end_time_unix_nano=pw.this.flattened["end_time_unix_nano"],
    trace_state=pw.this.flattened["trace_state"],
    flags=pw.this.flattened["flags"],
    status_code=pw.this.flattened["status_code"],
    status_message=pw.this.flattened["status_message"],
    attributes=pw.this.flattened["attributes"],
    dropped_attributes_count=pw.this.flattened["dropped_attributes_count"],
    events=pw.this.flattened["events"],
    dropped_events_count=pw.this.flattened["dropped_events_count"],
    links=pw.this.flattened["links"],
    dropped_links_count=pw.this.flattened["dropped_links_count"],
    resource_attributes=pw.this.flattened["resource_attributes"],
    resource_schema_url=pw.this.flattened["resource_schema_url"],
    scope_name=pw.this.flattened["scope_name"],
    scope_version=pw.this.flattened["scope_version"],
    scope_attributes=pw.this.flattened["scope_attributes"],
    scope_schema_url=pw.this.flattened["scope_schema_url"],
)._with_schema(Span)


# Read logs from Kafka
kafka_logs = pw.io.kafka.read(
    rdkafka_settings={
        "bootstrap.servers": "localhost:9092",
        "group.id": "otlp-logs-consumer",
        "auto.offset.reset": "earliest",
    },
    topic="otlp_logs",
    format="plaintext",
)


def flatten_logs(data: str) -> list[dict]:
    """Flatten OTLP logs"""
    logs = json.loads(data)
    flattened = []
    
    for resource_log in logs.get("resourceLogs", []):
        resource = resource_log.get("resource", {})
        resource_attrs = flatten_attributes(resource.get("attributes", []))
        resource_schema = resource_log.get("schemaUrl", "")
        
        for scope_log in resource_log.get("scopeLogs", []):
            scope = scope_log.get("scope", {})
            scope_name = scope.get("name", "")
            scope_version = scope.get("version", "")
            scope_attrs = flatten_attributes(scope.get("attributes", []))
            scope_schema = scope_log.get("schemaUrl", "")
            
            for log_record in scope_log.get("logRecords", []):
                # Extract body as AnyValue (optional)
                body = extract_anyvalue(log_record.get("body", {}))
                log_attrs = flatten_attributes(log_record.get("attributes", []))
                
                # Handle optional trace_id and span_id (can be invalid/empty)
                trace_id = log_record.get("traceId")
                span_id = log_record.get("spanId")
                
                flattened.append({
                    "time_unix_nano": log_record.get("timeUnixNano", 0),  # 0 = unknown
                    "observed_time_unix_nano": log_record.get("observedTimeUnixNano", 0),  # 0 = unknown
                    "severity_number": log_record.get("severityNumber", 0),  # Default SEVERITY_NUMBER_UNSPECIFIED
                    "severity_text": log_record.get("severityText", ""), 
                    "body": body,  # Optional
                    "log_attributes": log_attrs,
                    "dropped_attributes_count": log_record.get("droppedAttributesCount", 0),
                    "trace_id": trace_id,
                    "span_id": span_id,
                    "event_name": log_record.get("eventName", ""),
                    "flags": log_record.get("flags"),  # Optional
                    "resource_attributes": resource_attrs,
                    "resource_schema_url": resource_schema,
                    "scope_name": scope_name,
                    "scope_version": scope_version,
                    "scope_attributes": scope_attrs,
                    "scope_schema_url": scope_schema,
                })
    
    return flattened


logs_table = kafka_logs.select(
    flattened=pw.apply(flatten_logs, pw.this.data)
).flatten(pw.this.flattened).select(
    time_unix_nano=pw.this.flattened["time_unix_nano"],
    observed_time_unix_nano=pw.this.flattened["observed_time_unix_nano"],
    severity_number=pw.this.flattened["severity_number"],
    severity_text=pw.this.flattened["severity_text"],
    body=pw.this.flattened["body"],
    log_attributes=pw.this.flattened["log_attributes"],
    dropped_attributes_count=pw.this.flattened["dropped_attributes_count"],
    trace_id=pw.this.flattened["trace_id"],
    span_id=pw.this.flattened["span_id"],
    event_name=pw.this.flattened["event_name"],
    flags=pw.this.flattened["flags"],
    resource_attributes=pw.this.flattened["resource_attributes"],
    resource_schema_url=pw.this.flattened["resource_schema_url"],
    scope_name=pw.this.flattened["scope_name"],
    scope_version=pw.this.flattened["scope_version"],
    scope_attributes=pw.this.flattened["scope_attributes"],
    scope_schema_url=pw.this.flattened["scope_schema_url"],
)._with_schema(Log)


# Read metrics from Kafka
kafka_metrics = pw.io.kafka.read(
    rdkafka_settings={
        "bootstrap.servers": "localhost:9092",
        "group.id": "otlp-metrics-consumer",
        "auto.offset.reset": "earliest",
    },
    topic="otlp_metrics",
    format="plaintext",
)


def process_data_point(dp: dict, metric_type: str) -> dict:
    """Process a single data point with proper handling of optional fields"""
    # Flatten attributes
    dp_attrs = flatten_attributes(dp.get("attributes", []))
    
    # Required time field (0 = invalid, should skip)
    time = dp.get("timeUnixNano", 0)
    if time == 0:
        return None  # Invalid data point
    
    # Optional but strongly encouraged
    start_time = dp.get("startTimeUnixNano")
    
    # Extract value based on metric type
    value = None
    if metric_type in ["gauge", "sum"]:
        # NumberDataPoint - has oneof value
        if "asDouble" in dp:
            value = {"type": "double", "value": dp["asDouble"]}
        elif "asInt" in dp:
            value = {"type": "int", "value": dp["asInt"]}
    elif metric_type == "histogram":
        # HistogramDataPoint
        value = {
            "count": dp.get("count", 0),
            "sum": dp.get("sum"),  # Optional double
            "bucket_counts": dp.get("bucketCounts", []),
            "explicit_bounds": dp.get("explicitBounds", []),
            "min": dp.get("min"),  # Optional
            "max": dp.get("max"),  # Optional
        }
    elif metric_type == "exponential_histogram":
        # ExponentialHistogramDataPoint
        value = {
            "count": dp.get("count", 0),
            "sum": dp.get("sum"),  # Optional
            "scale": dp.get("scale", 0),
            "zero_count": dp.get("zeroCount", 0),
            "zero_threshold": dp.get("zeroThreshold", 0.0),
            "positive": dp.get("positive", {}),
            "negative": dp.get("negative", {}),
            "min": dp.get("min"),  # Optional
            "max": dp.get("max"),  # Optional
        }
    elif metric_type == "summary":
        # SummaryDataPoint
        value = {
            "count": dp.get("count", 0),
            "sum": dp.get("sum", 0.0),
            "quantile_values": dp.get("quantileValues", [])
        }
    
    # Process exemplars (optional)
    exemplars = []
    for ex in dp.get("exemplars", []):
        ex_value = None
        if "asDouble" in ex:
            ex_value = {"type": "double", "value": ex["asDouble"]}
        elif "asInt" in ex:
            ex_value = {"type": "int", "value": ex["asInt"]}
        
        exemplars.append({
            "filtered_attributes": flatten_attributes(ex.get("filteredAttributes", [])),
            "time_unix_nano": ex.get("timeUnixNano", 0),
            "value": ex_value,
            "span_id": ex.get("spanId"),  # Optional
            "trace_id": ex.get("traceId"),  # Optional
        })
    
    return {
        "attributes": dp_attrs,
        "start_time_unix_nano": start_time,
        "time_unix_nano": time,
        "value": value,
        "exemplars": exemplars if exemplars else [],
        "flags": dp.get("flags", 0),
    }


def flatten_metrics(data: str) -> list[dict]:
    """Flatten OTLP metrics while keeping data points as complete arrays"""
    metrics = json.loads(data)
    flattened = []
    
    for resource_metric in metrics.get("resourceMetrics", []):
        resource = resource_metric.get("resource", {})
        resource_attrs = flatten_attributes(resource.get("attributes", []))
        resource_schema = resource_metric.get("schemaUrl", "")
        
        for scope_metric in resource_metric.get("scopeMetrics", []):
            scope = scope_metric.get("scope", {})
            scope_name = scope.get("name", "")
            scope_version = scope.get("version", "")
            scope_attrs = flatten_attributes(scope.get("attributes", []))
            scope_schema = scope_metric.get("schemaUrl", "")
            
            for metric in scope_metric.get("metrics", []):
                metric_name = metric.get("name", "")
                metric_desc = metric.get("description", "")
                metric_unit = metric.get("unit", "")
                
                # Optional metric metadata
                metadata = flatten_attributes(metric.get("metadata", []))
                
                # Determine metric type and extract data points
                data_points_raw = []
                metric_type = ""
                aggregation_temporality = None
                is_monotonic = None
                
                if "gauge" in metric:
                    metric_type = "gauge"
                    data_points_raw = metric["gauge"].get("dataPoints", [])
                elif "sum" in metric:
                    metric_type = "sum"
                    sum_data = metric["sum"]
                    data_points_raw = sum_data.get("dataPoints", [])
                    aggregation_temporality = sum_data.get("aggregationTemporality", 0)
                    is_monotonic = sum_data.get("isMonotonic", False)
                elif "histogram" in metric:
                    metric_type = "histogram"
                    hist_data = metric["histogram"]
                    data_points_raw = hist_data.get("dataPoints", [])
                    aggregation_temporality = hist_data.get("aggregationTemporality", 0)
                elif "exponentialHistogram" in metric:
                    metric_type = "exponential_histogram"
                    exp_hist_data = metric["exponentialHistogram"]
                    data_points_raw = exp_hist_data.get("dataPoints", [])
                    aggregation_temporality = exp_hist_data.get("aggregationTemporality", 0)
                elif "summary" in metric:
                    metric_type = "summary"
                    data_points_raw = metric["summary"].get("dataPoints", [])
                
                # Process all data points
                data_points = []
                for dp in data_points_raw:
                    processed_dp = process_data_point(dp, metric_type)
                    if processed_dp:  # Skip invalid data points
                        data_points.append(processed_dp)
                
                # Only add metric if it has valid data points
                if data_points:
                    flattened.append({
                        "metric_name": metric_name,
                        "metric_description": metric_desc,
                        "metric_unit": metric_unit,
                        "metric_type": metric_type,
                        "metadata": metadata if metadata else {},
                        "aggregation_temporality": aggregation_temporality,
                        "is_monotonic": is_monotonic,
                        "data_points": data_points,
                        "resource_attributes": resource_attrs,
                        "resource_schema_url": resource_schema,
                        "scope_name": scope_name,
                        "scope_version": scope_version,
                        "scope_attributes": scope_attrs,
                        "scope_schema_url": scope_schema,
                    })
    
    return flattened


metrics_table = kafka_metrics.select(
    flattened=pw.apply(flatten_metrics, pw.this.data)
).flatten(pw.this.flattened).select(
    metric_name=pw.this.flattened["metric_name"],
    metric_description=pw.this.flattened["metric_description"],
    metric_unit=pw.this.flattened["metric_unit"],
    metric_type=pw.this.flattened["metric_type"],
    metadata=pw.this.flattened["metadata"],
    aggregation_temporality=pw.this.flattened["aggregation_temporality"],
    is_monotonic=pw.this.flattened["is_monotonic"],
    data_points=pw.this.flattened["data_points"],
    resource_attributes=pw.this.flattened["resource_attributes"],
    resource_schema_url=pw.this.flattened["resource_schema_url"],
    scope_name=pw.this.flattened["scope_name"],
    scope_version=pw.this.flattened["scope_version"],
    scope_attributes=pw.this.flattened["scope_attributes"],
    scope_schema_url=pw.this.flattened["scope_schema_url"],
)._with_schema(Metric)