package com.hack.app.chat.finance;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/finance-chat")
public class FinanceChatController {

    private final FinanceChatService financeChatService;

    public FinanceChatController(FinanceChatService financeChatService) {
        this.financeChatService = financeChatService;
    }

    @PostMapping
    public ResponseEntity<FinanceChatResponse> chat(@Valid @RequestBody FinanceChatRequest request) {
        FinanceChatResponse response = financeChatService.chat(request);
        return ResponseEntity.ok(response);
    }
}