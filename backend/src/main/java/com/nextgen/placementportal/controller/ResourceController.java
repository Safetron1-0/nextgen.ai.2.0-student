package com.nextgen.placementportal.controller;

import com.nextgen.placementportal.dto.ResourceDTO;
import com.nextgen.placementportal.model.Resource;
import com.nextgen.placementportal.repository.ResourceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    @Autowired
    private ResourceRepository resourceRepository;

    // GET /api/resources - List all resources
    @GetMapping
    public ResponseEntity<List<ResourceDTO>> getAllResources(@RequestParam(required = false) String category) {
        List<Resource> resources;
        if (category != null && !category.isEmpty()) {
            resources = resourceRepository.findByCategory(category);
        } else {
            resources = resourceRepository.findAllByOrderByCreatedAtDesc();
        }

        List<ResourceDTO> dtos = resources.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // POST /api/resources - Add new resource
    @PostMapping
    public ResponseEntity<?> createResource(@RequestBody ResourceDTO dto) {
        Resource resource = new Resource();
        resource.setTitle(dto.getTitle());
        resource.setDescription(dto.getDescription());
        resource.setUrl(dto.getUrl());
        resource.setCategory(dto.getCategory());
        resource.setFileType(dto.getFileType());
        resource.setUploadedBy(dto.getUploadedBy());

        resourceRepository.save(resource);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(resource));
    }

    // DELETE /api/resources/{id} - Delete resource
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteResource(@PathVariable Long id) {
        if (!resourceRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Resource not found.");
        }
        resourceRepository.deleteById(id);
        return ResponseEntity.ok("Resource deleted.");
    }

    private ResourceDTO toDTO(Resource r) {
        ResourceDTO dto = new ResourceDTO();
        dto.setId(r.getId());
        dto.setTitle(r.getTitle());
        dto.setDescription(r.getDescription());
        dto.setUrl(r.getUrl());
        dto.setCategory(r.getCategory());
        dto.setFileType(r.getFileType());
        dto.setUploadedBy(r.getUploadedBy());
        dto.setCreatedAt(r.getCreatedAt());
        return dto;
    }
}
