package com.hack.app;

import com.hack.app.user.PortalMoveRequest;
import com.hack.app.user.PortalMoveResponse;
import com.hack.app.user.UserRequest;
import com.hack.app.user.UserResponse;
import com.hack.app.user.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserResponse> listUsers() {
        return userService.getUsers();
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserRequest request) {
        UserResponse created = userService.createUser(request);
        return ResponseEntity.created(URI.create("/api/users/" + created.id()))
            .body(created);
    }

    @GetMapping("/{id}")
    public UserResponse getUser(@PathVariable String id) {
        return userService.getUserFlexible(id);
    }

    @PostMapping("/portal-move")
    public ResponseEntity<PortalMoveResponse> portalMove(@Valid @RequestBody PortalMoveRequest request) {
        PortalMoveResponse response = userService.getJobAndGoldByUserId(request.userId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/job")
    public ResponseEntity<UserResponse> updateUserJobByName(@Valid @RequestBody UserJobRequest request) {
        UserResponse updated = userService.updateUserJobByName(request.zepUserId(), request.job());
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/gold")
    public ResponseEntity<UserResponse> updateUserGold(@PathVariable Long id, @RequestBody GoldUpdateRequest request) {
        UserResponse updated = userService.updateUserGold(id, request.goldAmount());
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/job")
    public ResponseEntity<UserResponse> updateUserJob(@PathVariable Long id, @RequestBody JobUpdateRequest request) {
        UserResponse updated = userService.updateUserJob(id, request.job());
        return ResponseEntity.ok(updated);
    }
}

record GoldUpdateRequest(int goldAmount) {}

record JobUpdateRequest(String job) {}

record UserJobRequest(@NotBlank(message = "사용자 ID를 입력해주세요") String zepUserId,
                      @NotBlank(message = "직업을 입력해주세요") String job) {}
