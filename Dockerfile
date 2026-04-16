# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — Multi-stage build for Family Budget Spring Boot app
#
# Stage 1 (builder) : compiles the Java source and packages the fat JAR
# Stage 2 (runtime) : copies only the JAR into a slim JRE image
#
# Railway will build this automatically when it detects a Dockerfile.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /build

# Copy Maven wrapper and pom first (layer-caches dependency downloads)
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

RUN chmod +x mvnw && \
    ./mvnw dependency:go-offline -B --no-transfer-progress

# Copy source and build the fat JAR (skip tests for faster CI builds)
COPY src src
RUN ./mvnw package -DskipTests -B --no-transfer-progress

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy the fat JAR from the build stage
COPY --from=builder /build/target/*.jar app.jar

# Railway injects PORT at runtime; Spring reads ${PORT:8080}
EXPOSE 8080

# JVM flags:
#  -XX:+UseContainerSupport        — respect cgroup memory limits
#  -XX:MaxRAMPercentage=75.0       — use 75% of container RAM for heap
#  -Djava.security.egd=...         — faster startup on Linux containers
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
