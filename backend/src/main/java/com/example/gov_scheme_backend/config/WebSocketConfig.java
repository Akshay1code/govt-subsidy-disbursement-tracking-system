package com.example.gov_scheme_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Use the built-in message broker for subscriptions and broadcasting
        // /queue for user-specific, /topic for global broadcasts
        config.enableSimpleBroker("/topic", "/queue");
        
        // Application destinations prefix
        config.setApplicationDestinationPrefixes("/app");
        
        // Prefix used to send messages to specific users
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Native WebSocket endpoint — used by the frontend's @stomp/stompjs client
        // (brokerURL: ws(s)://<host>/ws). The handshake is a normal HTTP GET that
        // flows through the existing Spring Security chain + JwtAuthenticationFilter,
        // which reads the "token" cookie and authenticates the request. Spring then
        // binds that authenticated Principal to the STOMP session, so
        // convertAndSendToUser(username, ...) routes to the right user WITHOUT any
        // change to the security configuration.
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");

        // SockJS fallback endpoint for environments/proxies where raw WebSocket
        // upgrades are blocked. Same cookie-based handshake authentication applies.
        registry.addEndpoint("/ws-sockjs")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
