FROM fluent/fluentd:v1.16-1

USER root

RUN fluent-gem install fluent-plugin-rewrite-tag-filter
RUN fluent-gem install fluent-plugin-detect-exceptions


USER fluent
