FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY backend/ /app
RUN chmod +x ./gradlew && ./gradlew bootJar -x test

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java","-XX:+UseContainerSupport","-XX:MaxRAMPercentage=75","-jar","/app/app.jar"]
