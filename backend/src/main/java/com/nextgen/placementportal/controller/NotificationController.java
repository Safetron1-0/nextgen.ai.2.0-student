package com.nextgen.placementportal.controller;

import com.nextgen.placementportal.dto.NotificationDTO;
import com.nextgen.placementportal.model.Notification;
import com.nextgen.placementportal.model.Student;
import com.nextgen.placementportal.model.User;
import com.nextgen.placementportal.repository.NotificationRepository;
import com.nextgen.placementportal.repository.StudentRepository;
import com.nextgen.placementportal.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    // GET /api/notifications/my?username={username}
    @GetMapping("/my")
    public ResponseEntity<?> getMyNotifications(@RequestParam String username) {
        Optional<Student> student = getStudentByUsername(username);
        if (student.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Student not found.");
        }

        List<NotificationDTO> notifications = notificationRepository
                .findByStudentIdOrderByCreatedAtDesc(student.get().getId()).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(notifications);
    }

    // GET /api/notifications/my/unread-count?username={username}
    @GetMapping("/my/unread-count")
    public ResponseEntity<?> getUnreadCount(@RequestParam String username) {
        Optional<Student> student = getStudentByUsername(username);
        if (student.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Student not found.");
        }

        long count = notificationRepository.countByStudentIdAndIsRead(student.get().getId(), false);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    // PUT /api/notifications/{id}/read
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        Optional<Notification> opt = notificationRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Notification not found.");
        }

        Notification n = opt.get();
        n.setIsRead(true);
        notificationRepository.save(n);
        return ResponseEntity.ok(toDTO(n));
    }

    // PUT /api/notifications/my/read-all?username={username}
    @PutMapping("/my/read-all")
    public ResponseEntity<?> markAllAsRead(@RequestParam String username) {
        Optional<Student> student = getStudentByUsername(username);
        if (student.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Student not found.");
        }

        List<Notification> notifications = notificationRepository
                .findByStudentIdOrderByCreatedAtDesc(student.get().getId());
        notifications.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(notifications);
        return ResponseEntity.ok("All notifications marked as read.");
    }

    // POST /api/notifications - Create notification (for testing/coordinator)
    @PostMapping
    public ResponseEntity<?> createNotification(@RequestBody NotificationDTO dto) {
        Notification n = new Notification();
        n.setStudentId(dto.getId()); // Pass studentId via the id field or add a separate field
        n.setTitle(dto.getTitle());
        n.setMessage(dto.getMessage());
        n.setType(dto.getType() != null ? dto.getType() : "INFO");
        notificationRepository.save(n);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(n));
    }

    private Optional<Student> getStudentByUsername(String username) {
        Optional<User> user = userRepository.findByUsername(username);
        if (user.isEmpty()) return Optional.empty();
        return studentRepository.findByUserId(user.get().getId());
    }

    private NotificationDTO toDTO(Notification n) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(n.getId());
        dto.setTitle(n.getTitle());
        dto.setMessage(n.getMessage());
        dto.setType(n.getType());
        dto.setIsRead(n.getIsRead());
        dto.setCreatedAt(n.getCreatedAt());
        return dto;
    }
}
