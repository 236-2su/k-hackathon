package com.hack.app.gemini;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private final GeminiProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiClient(GeminiProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) properties.getTimeout().toMillis());
        requestFactory.setReadTimeout((int) properties.getTimeout().toMillis());

        this.restClient = RestClient.builder()
            .baseUrl(properties.getBaseUrl())
            .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
            .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
            .requestFactory(requestFactory)
            .build();

        this.objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public boolean isEnabled() {
        return properties.getApiKey() != null && !properties.getApiKey().isBlank();
    }

    public Optional<String> generateContent(String prompt, @Nullable Map<String, Object> generationConfig) {
        if (!isEnabled()) {
            log.warn("Gemini API key is not configured. Skipping generateContent call.");
            return Optional.empty();
        }

        Map<String, Object> request = new HashMap<>();
        request.put("contents", List.of(Map.of(
            "role", "user",
            "parts", List.of(Map.of("text", prompt))
        )));
        if (generationConfig != null && !generationConfig.isEmpty()) {
            request.put("generationConfig", generationConfig);
        }

        try {
            ResponseEntity<byte[]> response = restClient.post()
                .uri(uriBuilder -> uriBuilder
                    .path("/models/{model}:generateContent")
                    .queryParam("key", properties.getApiKey())
                    .queryParam("alt", "json")
                    .build(properties.getModel()))
                .body(request)
                .retrieve()
                .toEntity(byte[].class);

            byte[] body = response.getBody();
            if (body == null || body.length == 0) {
                return Optional.empty();
            }

            String raw = new String(body, StandardCharsets.UTF_8);
            GeminiResponse parsed = objectMapper.readValue(raw, GeminiResponse.class);
            if (parsed.candidates() == null || parsed.candidates().isEmpty()) {
                return Optional.empty();
            }

            return parsed.candidates().stream()
                .map(GeminiResponse.Candidate::content)
                .filter(content -> content != null && content.parts() != null)
                .flatMap(content -> content.parts().stream())
                .map(GeminiResponse.Part::text)
                .filter(text -> text != null && !text.isBlank())
                .findFirst();
        } catch (Exception ex) {
            log.error("Failed to call Gemini generateContent API", ex);
            return Optional.empty();
        }
    }

    public record GeminiResponse(List<Candidate> candidates) {
        public record Candidate(Content content) {}
        public record Content(List<Part> parts) {}
        public record Part(String text) {}
    }
}