package com.hack.app;

import com.hack.app.user.UserResponse;
import com.hack.app.user.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class ZepAuthController {

    private final UserService userService;

    public ZepAuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/zep-session")
    public ResponseEntity<UserResponse> upsertSession(@Valid @RequestBody ZepSessionRequest request) {
        UserResponse response = userService.upsertZepUser(request.zepUserId(), request.nickname(), request.job());
        return ResponseEntity.ok(response);
    }
}

record ZepSessionRequest(
    @NotBlank(message = "유저 ID를 입력해 주세요") String zepUserId,
    String nickname,
    String job
) {}