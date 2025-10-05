package com.hack.app.openai;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonInclude;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class OpenAiClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiClient.class);

    private final RestClient restClient;
    private final OpenAiProperties properties;

    public OpenAiClient(OpenAiProperties properties) {
        this.properties = properties;
        String apiKey = properties.getApiKey() == null ? "" : properties.getApiKey();
        this.restClient = RestClient.builder()
            .baseUrl(properties.getBaseUrl())
            .defaultHeader("Authorization", "Bearer " + apiKey)
            .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
            .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
            .build();
    }

    public boolean isEnabled() {
        return properties.getApiKey() != null && !properties.getApiKey().isBlank();
    }

    public Optional<String> createChatCompletion(List<Message> messages, Double temperature) {
        return createChatCompletion(messages, temperature, Collections.emptyMap());
    }

    public Optional<String> createChatCompletion(List<Message> messages, Double temperature, Map<String, Object> additionalParams) {
        if (!isEnabled()) {
            log.warn("OpenAI API key is not configured. Skipping chat completion call.");
            return Optional.empty();
        }

        ChatCompletionRequest	request = new ChatCompletionRequest(
            properties.getChatModel(),
            messages,
            temperature,
            additionalParams
        );

        try {
            ChatCompletionResponse response = restClient.post()
                .uri("/chat/completions")
                .body(request)
                .retrieve()
                .body(ChatCompletionResponse.class);

            if (response == null || response.choices().isEmpty()) {
                return Optional.empty();
            }

            return response.choices().stream()
                .map(ChatCompletionResponse.Choice::message)
                .map(Message::content)
                .filter(content -> content != null && !content.isBlank())
                .findFirst();
        } catch (Exception ex) {
            log.error("Failed to call OpenAI chat completion API", ex);
            return Optional.empty();
        }
    }

    public record Message(String role, String content) {
        public static Message system(String content) {
            return new Message("system", content);
        }

        public static Message user(String content) {
            return new Message("user", content);
        }

        public static Message assistant(String content) {
            return new Message("assistant", content);
        }
    }

    public record ChatCompletionRequest(
        String model,
        List<Message> messages,
        Double temperature,
        @JsonInclude(JsonInclude.Include.NON_EMPTY)
        Map<String, Object> additionalParams
    ) {
        @JsonAnyGetter
        public Map<String, Object> additionalParams() {
            return additionalParams;
        }
    }

    public record ChatCompletionResponse(List<Choice> choices) {
        public record Choice(Message message) {}
    }
}