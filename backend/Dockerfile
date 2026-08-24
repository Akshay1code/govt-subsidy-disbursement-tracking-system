# ─── Stage 1: Build the application ──────────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /app

# Copy the maven wrapper and pom.xml
COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# Make the wrapper executable
RUN chmod +x ./mvnw

# Download dependencies (this caches them in a layer)
RUN ./mvnw dependency:go-offline

# Copy the source code
COPY src ./src

# Build the application, skipping tests to speed up the build
RUN ./mvnw clean package -DskipTests

# ─── Stage 2: Run the application ────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Add a non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy the built jar from the build stage
COPY --from=build /app/target/gov-scheme-backend-0.0.1-SNAPSHOT.jar app.jar

# Expose the default Spring Boot port
EXPOSE 8080

# Run the jar
ENTRYPOINT ["java", "-jar", "app.jar"]
