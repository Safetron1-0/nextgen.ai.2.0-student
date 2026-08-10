package com.nextgen.placementportal.controller;

import com.nextgen.placementportal.dto.OnDutyRequestDTO;
import com.nextgen.placementportal.model.OnDutyRequest;
import com.nextgen.placementportal.model.Student;
import com.nextgen.placementportal.model.User;
import com.nextgen.placementportal.repository.OnDutyRequestRepository;
import com.nextgen.placementportal.repository.StudentRepository;
import com.nextgen.placementportal.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/on-duty")
public class OnDutyController {

    @Autowired
    private OnDutyRequestRepository onDutyRequestRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    // POST /api/on-duty - Student submits an on-duty request
    @PostMapping
    public ResponseEntity<?> createOnDutyRequest(@RequestBody OnDutyRequestDTO dto,
                                                  @RequestParam String username) {
        Optional<Student> student = getStudentByUsername(username);
        if (student.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Student not found.");
        }

        OnDutyRequest request = new OnDutyRequest();
        request.setStudentId(student.get().getId());
        request.setTitle(dto.getTitle());
        request.setReason(dto.getReason());
        request.setFromDate(dto.getFromDate());
        request.setToDate(dto.getToDate());
        request.setStatus("PENDING");

        onDutyRequestRepository.save(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(request, student.get().getName()));
    }

    // GET /api/on-duty/my?username={username} - Get student's own on-duty entries
    @GetMapping("/my")
    public ResponseEntity<?> getMyOnDutyRequests(@RequestParam String username) {
        Optional<Student> student = getStudentByUsername(username);
        if (student.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Student not found.");
        }

        List<OnDutyRequestDTO> requests = onDutyRequestRepository
                .findByStudentIdOrderByCreatedAtDesc(student.get().getId()).stream()
                .map(r -> toDTO(r, student.get().getName()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(requests);
    }

    // GET /api/on-duty/all - Get all on-duty entries (for confirmation report)
    @GetMapping("/all")
    public ResponseEntity<List<OnDutyRequestDTO>> getAllOnDutyRequests() {
        List<OnDutyRequestDTO> requests = onDutyRequestRepository
                .findAllByOrderByCreatedAtDesc().stream()
                .map(r -> {
                    String name = "";
                    if (r.getStudent() != null) {
                        name = r.getStudent().getName();
                    }
                    return toDTO(r, name);
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(requests);
    }

    // PUT /api/on-duty/{id}/status - Update on-duty status (approve/reject)
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id,
                                           @RequestParam String status) {
        Optional<OnDutyRequest> opt = onDutyRequestRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("On-duty request not found.");
        }

        OnDutyRequest request = opt.get();
        request.setStatus(status.toUpperCase());
        onDutyRequestRepository.save(request);

        String studentName = request.getStudent() != null ? request.getStudent().getName() : "";
        return ResponseEntity.ok(toDTO(request, studentName));
    }

    private Optional<Student> getStudentByUsername(String username) {
        Optional<User> user = userRepository.findByUsername(username);
        if (user.isEmpty()) return Optional.empty();
        return studentRepository.findByUserId(user.get().getId());
    }

    private OnDutyRequestDTO toDTO(OnDutyRequest r, String studentName) {
        OnDutyRequestDTO dto = new OnDutyRequestDTO();
        dto.setId(r.getId());
        dto.setStudentId(r.getStudentId());
        dto.setStudentName(studentName);
        dto.setTitle(r.getTitle());
        dto.setReason(r.getReason());
        dto.setFromDate(r.getFromDate());
        dto.setToDate(r.getToDate());
        dto.setStatus(r.getStatus());
        dto.setCreatedAt(r.getCreatedAt());
        return dto;
    }
}
