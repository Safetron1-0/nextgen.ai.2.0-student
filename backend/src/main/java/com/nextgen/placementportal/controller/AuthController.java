package com.nextgen.placementportal.controller;

import com.nextgen.placementportal.dto.AuthResponse;
import com.nextgen.placementportal.dto.LoginRequest;
import com.nextgen.placementportal.dto.RegisterRequest;
import com.nextgen.placementportal.model.User;
import com.nextgen.placementportal.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.Key;
import java.util.Date;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Fixed key generated at runtime
    private static final Key jwtKey = Keys.secretKeyFor(SignatureAlgorithm.HS256);

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (request.getUsername() == null || request.getUsername().trim().isEmpty() ||
            request.getPassword() == null || request.getPassword().isEmpty() ||
            request.getRole() == null) {
            return ResponseEntity.badRequest().body("Username, password, and role are required.");
        }

        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Username is already taken.");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole().toLowerCase());

        userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body("User registered successfully.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        if (request.getUsername() == null || request.getPassword() == null || request.getRole() == null) {
            return ResponseEntity.badRequest().body("Username, password, and role are required.");
        }

        Optional<User> optionalUser = userRepository.findByUsername(request.getUsername());
        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password.");
        }

        User user = optionalUser.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password.");
        }

        if (!user.getRole().equalsIgnoreCase(request.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid role for this user.");
        }

        // Generate token
        String token = Jwts.builder()
                .setSubject(user.getUsername())
                .claim("role", user.getRole())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 86400000)) // 1 day
                .signWith(jwtKey)
                .compact();

        return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getRole()));
    }

    // PUT /api/auth/change-password
    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody java.util.Map<String, String> body) {
        String username    = body.get("username");
        String currentPwd  = body.get("currentPassword");
        String newPwd      = body.get("newPassword");

        if (username == null || currentPwd == null || newPwd == null || newPwd.length() < 6) {
            return ResponseEntity.badRequest()
                    .body("username, currentPassword and newPassword (min 6 chars) are required.");
        }

        Optional<User> optUser = userRepository.findByUsername(username);
        if (optUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }

        User user = optUser.get();
        if (!passwordEncoder.matches(currentPwd, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Current password is incorrect.");
        }

        user.setPassword(passwordEncoder.encode(newPwd));
        userRepository.save(user);
        return ResponseEntity.ok("Password changed successfully.");
    }
}
