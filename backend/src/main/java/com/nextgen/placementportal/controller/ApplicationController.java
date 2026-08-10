package com.nextgen.placementportal.controller;

import com.nextgen.placementportal.dto.ApplicationDTO;
import com.nextgen.placementportal.dto.ApplicationStatsDTO;
import com.nextgen.placementportal.model.Application;
import com.nextgen.placementportal.model.Student;
import com.nextgen.placementportal.model.User;
import com.nextgen.placementportal.repository.ApplicationRepository;
import com.nextgen.placementportal.repository.StudentRepository;
import com.nextgen.placementportal.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    // GET /api/applications - List all applications (coordinator)
    @GetMapping
    public ResponseEntity<List<ApplicationDTO>> getAllApplications() {
        List<ApplicationDTO> apps = applicationRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(apps);
    }

    // GET /api/applications/my?username={username} - Get current student's applications
    @GetMapping("/my")
    public ResponseEntity<?> getMyApplications(@RequestParam String username) {
        Optional<User> user = userRepository.findByUsername(username);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        Optional<Student> student = studentRepository.findByUserId(user.get().getId());
        if (student.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Student profile not found.");
        }

        List<ApplicationDTO> apps = applicationRepository.findByStudentId(student.get().getId()).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(apps);
    }

    // GET /api/applications/my/stats?username={username} - Get "At a Glance" counts
    @GetMapping("/my/stats")
    public ResponseEntity<?> getMyStats(@RequestParam String username) {
        Optional<User> user = userRepository.findByUsername(username);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        Optional<Student> student = studentRepository.findByUserId(user.get().getId());
        if (student.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Student profile not found.");
        }

        Long sid = student.get().getId();
        ApplicationStatsDTO stats = new ApplicationStatsDTO(
                applicationRepository.countByStudentIdAndStatus(sid, "APPLIED"),
                applicationRepository.countByStudentIdAndStatus(sid, "SHORTLISTED"),
                applicationRepository.countByStudentIdAndStatus(sid, "NEXT_ROUND"),
                applicationRepository.countByStudentIdAndStatus(sid, "SELECTED"),
                applicationRepository.countByStudentIdAndStatus(sid, "REJECTED")
        );
        return ResponseEntity.ok(stats);
    }

    // POST /api/applications - Create new application
    @PostMapping
    public ResponseEntity<?> createApplication(@RequestBody ApplicationDTO dto) {
        Application app = new Application();
        app.setStudentId(dto.getStudentId());
        app.setCompanyId(dto.getCompanyId());
        app.setRole(dto.getRole());
        app.setStatus(dto.getStatus() != null ? dto.getStatus() : "APPLIED");
        app.setNextAction(dto.getNextAction());
        app.setDate(dto.getDate());
        app.setPackageLpa(dto.getPackageLpa());

        applicationRepository.save(app);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(app));
    }

    // PUT /api/applications/{id} - Update application status
    @PutMapping("/{id}")
    public ResponseEntity<?> updateApplication(@PathVariable Long id, @RequestBody ApplicationDTO dto) {
        Optional<Application> optApp = applicationRepository.findById(id);
        if (optApp.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Application not found.");
        }

        Application app = optApp.get();
        if (dto.getStatus() != null) app.setStatus(dto.getStatus());
        if (dto.getNextAction() != null) app.setNextAction(dto.getNextAction());
        if (dto.getRole() != null) app.setRole(dto.getRole());
        if (dto.getDate() != null) app.setDate(dto.getDate());
        if (dto.getPackageLpa() != null) app.setPackageLpa(dto.getPackageLpa());
        app.setUpdatedAt(LocalDateTime.now());

        applicationRepository.save(app);
        return ResponseEntity.ok(toDTO(app));
    }

    // DELETE /api/applications/{id} - Delete application
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteApplication(@PathVariable Long id) {
        if (!applicationRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Application not found.");
        }
        applicationRepository.deleteById(id);
        return ResponseEntity.ok("Application deleted.");
    }

    private ApplicationDTO toDTO(Application a) {
        ApplicationDTO dto = new ApplicationDTO();
        dto.setId(a.getId());
        dto.setStudentId(a.getStudentId());
        dto.setCompanyId(a.getCompanyId());
        dto.setRole(a.getRole());
        dto.setStatus(a.getStatus());
        dto.setNextAction(a.getNextAction());
        dto.setDate(a.getDate());
        dto.setPackageLpa(a.getPackageLpa());
        // Set company name if company is loaded
        if (a.getCompany() != null) {
            dto.setCompanyName(a.getCompany().getName());
        }
        return dto;
    }
}
