package com.hack.app;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hack.app.user.UserRequest;
import com.hack.app.user.UserResponse;
import com.hack.app.user.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    UserService userService;

    @Test
    @DisplayName("사용자 목록을 조회하면 서비스에서 받은 데이터를 반환한다")
    void listUsers() throws Exception {
        OffsetDateTime createdAt = OffsetDateTime.parse("2025-10-01T00:00:00Z");
        when(userService.getUsers()).thenReturn(List.of(
            new UserResponse(1L, "홍길동", "hong@example.com", createdAt)
        ));

        mockMvc.perform(get("/api/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(1))
            .andExpect(jsonPath("$[0].name").value("홍길동"))
            .andExpect(jsonPath("$[0].email").value("hong@example.com"));
    }

    @Test
    @DisplayName("사용자를 생성하면 201 응답과 함께 Location 헤더를 반환한다")
    void createUser() throws Exception {
        OffsetDateTime createdAt = OffsetDateTime.parse("2025-10-01T00:00:00Z");
        when(userService.createUser(any(UserRequest.class))).thenReturn(
            new UserResponse(10L, "테스터", "tester@example.com", createdAt)
        );

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new UserRequest("테스터", "tester@example.com"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(10))
            .andExpect(jsonPath("$.name").value("테스터"))
            .andExpect(jsonPath("$.email").value("tester@example.com"));

        ArgumentCaptor<UserRequest> captor = ArgumentCaptor.forClass(UserRequest.class);
        verify(userService).createUser(captor.capture());
        assertThat(captor.getValue().name()).isEqualTo("테스터");
        assertThat(captor.getValue().email()).isEqualTo("tester@example.com");
    }
}
