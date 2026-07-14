package com.ooselab.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    
     @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve uploaded certificate files
        registry.addResourceHandler("/uploads/certificates/**")
                .addResourceLocations("file:uploads/certificates/");
        
        // Serve uploaded project files
        registry.addResourceHandler("/uploads/projects/**")
                .addResourceLocations("file:uploads/projects/");
    }
}
