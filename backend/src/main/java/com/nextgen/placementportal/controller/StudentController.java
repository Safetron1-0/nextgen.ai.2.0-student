package com.nextgen.placementportal.controller;

import com.nextgen.placementportal.dto.StudentDTO;
import com.nextgen.placementportal.model.Student;
import com.nextgen.placementportal.model.User;
import com.nextgen.placementportal.repository.StudentRepository;
import com.nextgen.placementportal.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // GET /api/students - List all students
    @GetMapping
    public ResponseEntity<List<StudentDTO>> getAllStudents() {
        List<StudentDTO> students = studentRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(students);
    }

    // GET /api/students/me?username={username} - Get current student's profile
    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(@RequestParam String username) {
        Optional<User> user = userRepository.findByUsername(username);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        Optional<Student> student = studentRepository.findByUserId(user.get().getId());
        if (student.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Student profile not found.");
        }
        return ResponseEntity.ok(toDTO(student.get()));
    }

    // GET /api/students/{id} - Get student by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getStudentById(@PathVariable Long id) {
        Optional<Student> student = studentRepository.findById(id);
        if (student.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Student not found.");
        }
        return ResponseEntity.ok(toDTO(student.get()));
    }

    // POST /api/students?username={username} - Coordinator creates student profile + user account
    @PostMapping
    public ResponseEntity<?> createStudent(@RequestBody StudentDTO dto,
                                           @RequestParam(required = false) String username) {
        User user = null;

        if (dto.getUserId() != null) {
            user = userRepository.findById(dto.getUserId()).orElse(null);
        } else if (username != null && !username.trim().isEmpty()) {
            Optional<User> optUser = userRepository.findByUsername(username);
            if (optUser.isPresent()) {
                user = optUser.get();
            } else {
                // Auto-create user with default password = username + "123"
                User newUser = new User();
                newUser.setUsername(username);
                newUser.setPassword(passwordEncoder.encode(username + "123"));
                newUser.setRole("student");
                user = userRepository.save(newUser);
            }
        }

        if (user == null) {
            return ResponseEntity.badRequest().body("Username is required to create a student profile.");
        }

        if (studentRepository.findByUserId(user.getId()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Student profile already exists for this user.");
        }

        Student student = new Student();
        student.setUserId(user.getId());
        student.setName(dto.getName() != null ? dto.getName() : user.getUsername());
        student.setEmail(dto.getEmail());
        student.setDepartment(dto.getDepartment());
        student.setYear(dto.getYear());
        student.setCgpa(dto.getCgpa());
        student.setPhone(dto.getPhone());

        String initials = "ST";
        if (student.getName() != null && student.getName().length() >= 2) {
            initials = student.getName().substring(0, 2).toUpperCase();
        }
        student.setAvatarInitials(initials);

        studentRepository.save(student);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(student));
    }

    // PUT /api/students/{id} - Update student profile
    @PutMapping("/{id}")
    public ResponseEntity<?> updateStudent(@PathVariable Long id, @RequestBody StudentDTO dto) {
        Optional<Student> optStudent = studentRepository.findById(id);
        if (optStudent.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Student not found.");
        }

        Student student = optStudent.get();
        if (dto.getName() != null) student.setName(dto.getName());
        if (dto.getEmail() != null) student.setEmail(dto.getEmail());
        if (dto.getDepartment() != null) student.setDepartment(dto.getDepartment());
        if (dto.getYear() != null) student.setYear(dto.getYear());
        if (dto.getCgpa() != null) student.setCgpa(dto.getCgpa());
        if (dto.getPhone() != null) student.setPhone(dto.getPhone());
        if (dto.getAvatarInitials() != null) student.setAvatarInitials(dto.getAvatarInitials());

        studentRepository.save(student);
        return ResponseEntity.ok(toDTO(student));
    }

    private StudentDTO toDTO(Student s) {
        StudentDTO dto = new StudentDTO();
        dto.setId(s.getId());
        dto.setUserId(s.getUserId());
        dto.setName(s.getName());
        dto.setEmail(s.getEmail());
        dto.setDepartment(s.getDepartment());
        dto.setYear(s.getYear());
        dto.setCgpa(s.getCgpa());
        dto.setPhone(s.getPhone());
        dto.setAvatarInitials(s.getAvatarInitials());
        return dto;
    }
}
