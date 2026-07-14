package com.ooselab.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;
@SpringBootApplication
@EnableMongoRepositories(basePackages = "com.ooselab.repository")
@ComponentScan(basePackages = {"com.ooselab"})
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
        System.out.println("=================================");
        System.out.println("Software Personnel Management System");
        System.out.println("Started on: http://localhost:8080");
        System.out.println("=================================");
    }
}