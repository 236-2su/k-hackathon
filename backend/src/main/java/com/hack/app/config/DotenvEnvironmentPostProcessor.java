package com.hack.app.config;

import io.github.cdimascio.dotenv.Dotenv;
import io.github.cdimascio.dotenv.DotenvEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final Logger log = LoggerFactory.getLogger(DotenvEnvironmentPostProcessor.class);
    private static final String PROPERTY_SOURCE_NAME = "dotenv";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Dotenv dotenv = loadDotenv();

        Map<String, Object> properties = new HashMap<>();
        for (DotenvEntry entry : dotenv.entries()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (value == null) {
                continue;
            }
            if (!environment.containsProperty(key)) {
                properties.put(key, value);
            }
            environment.getSystemProperties().putIfAbsent(key, value);
        }

        if (!properties.isEmpty()) {
            MapPropertySource propertySource = new MapPropertySource(PROPERTY_SOURCE_NAME, properties);
            environment.getPropertySources().addLast(propertySource);
            log.info("Loaded {} entries from .env", properties.size());
        } else {
            log.warn(".env file was not found or contained no entries; continuing without overrides");
        }
    }

    private Dotenv loadDotenv() {
        List<String> candidateDirectories = List.of(
            ".",
            "backend",
            "../backend",
            "../../backend"
        );

        for (String dir : candidateDirectories) {
            Dotenv dotenv = Dotenv.configure()
                .directory(dir)
                .ignoreIfMalformed()
                .ignoreIfMissing()
                .load();

            if (!dotenv.entries().isEmpty()) {
                Path absolutePath = Path.of(dir).toAbsolutePath().normalize();
                log.info("Loaded .env from {}", absolutePath);
                return dotenv;
            }
        }

        return Dotenv.configure()
            .ignoreIfMalformed()
            .ignoreIfMissing()
            .load();
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}