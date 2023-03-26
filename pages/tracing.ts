// pilfered from https://github.com/open-telemetry/opentelemetry-demo/blob/9abfe562626227cef9d91e41fe9ce5f01d1dd0ff/src/frontend/utils/telemetry/FrontendTracer.ts

import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator
} from '@opentelemetry/core';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { Resource, detectResources, browserDetector } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

console.log('JESS tracing was loaded');

const FrontendTracer = async (collectorString: string) => {
  const { ZoneContextManager } = await import('@opentelemetry/context-zone');
  console.log('past the await import');

  let resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'jess-the-client-side'
  });

  const detectedResources = await detectResources({ detectors: [browserDetector] });
  resource = resource.merge(detectedResources);
  const provider = new WebTracerProvider({
    resource
  });

  const NEXT_PUBLIC_HONEYCOMB_API_KEY = process.env.NEXT_PUBLIC_HONEYCOMB_API_KEY;

  provider.addSpanProcessor(
    new SimpleSpanProcessor(
      new OTLPTraceExporter({
        url: 'https://api.honeycomb.io/v1/traces',
        headers: { 'x-honeycomb-team': NEXT_PUBLIC_HONEYCOMB_API_KEY }
      })
    )
  );

  const contextManager = new ZoneContextManager();

  provider.register({
    contextManager,
    propagator: new CompositePropagator({
      propagators: [new W3CBaggagePropagator(), new W3CTraceContextPropagator()]
    })
  });

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-fetch': {
          propagateTraceHeaderCorsUrls: /.*/,
          clearTimingResources: true,
          applyCustomAttributesOnSpan(span) {
            span.setAttribute('app.synthetic_request', 'false');
          }
        }
      })
    ]
  });
};

export default FrontendTracer;
