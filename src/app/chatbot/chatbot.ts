import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChatBotService } from './chat-bot-service';

export interface Message {
  id: number;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type: 'text' | 'quick-reply';
  quickReplies?: string[];
  isLoading?: boolean;
}

export interface ChatSession {
  id: number;
  title: string;
  lastMessage: string;
  timestamp: Date;
  unread: boolean;
}

export interface BotResponse {
  message: string;
  quickReplies?: string[];
  sessionId?: string;
  timestamp?: string;
}

@Component({
  selector: 'app-chatbot',
  imports: [CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    MatDividerModule,
    MatBadgeModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.scss'
})
export class Chatbot implements OnInit, AfterViewChecked {

  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  private snackBar = inject(MatSnackBar);
  private chatBotService = inject(ChatBotService);

  // Signals for state management
  
  messages = signal<Message[]>([
    {
      id: 1,
      content: 'Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd\'hui ?',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text',
      quickReplies: ['Que pouvez-vous faire ?', 'Parlez-moi des fonctionnalités', 'Aide avec le compte']
    }
  ]);

  chatSessions = signal<ChatSession[]>([
    { id: 1, title: 'Support Général', lastMessage: 'Bonjour ! Comment puis-vous aider ?', timestamp: new Date(), unread: false },
    { id: 2, title: 'Problèmes Techniques', lastMessage: 'Laissez-moi vérifier cela pour vous...', timestamp: new Date(Date.now() - 3600000), unread: true },
    { id: 3, title: 'Questions de Facturation', lastMessage: 'Votre paiement a été traité', timestamp: new Date(Date.now() - 86400000), unread: false }
  ]);

  // Regular property for two-way binding instead of signal
  newMessage = '';
  isSending = signal(false);
  selectedSession = signal(1);
  isSidebarOpen = signal(true);

  unreadCount = computed(() => 
    this.chatSessions().filter(session => session.unread).length
  );

  currentSessionMessages = computed(() =>
    this.messages().filter(msg => this.isMessageInCurrentSession(msg))
  );

  ngOnInit() {
    this.scrollToBottom();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  sendMessage(): void {
    const message = this.newMessage.trim();
    if (!message) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    this.messages.update(messages => [...messages, userMessage]);
    this.newMessage = '';
    this.isSending.set(true);

    // Add loading message
    const loadingMessage: Message = {
      id: Date.now() + 1,
      content: '',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text',
      isLoading: true
    };

    this.messages.update(messages => [...messages, loadingMessage]);

    // Send message to API
    this.chatBotService.sendMessageToBot(message).subscribe({
      next: (response: BotResponse) => {
        this.isSending.set(false);
        
        // Remove loading message
        this.messages.update(messages => 
          messages.filter(msg => !msg.isLoading)
        );

        // Add bot response
        const botMessage: Message = {
          id: Date.now() + 2,
          content: response.message,
          sender: 'bot',
          timestamp: new Date(),
          type: response.quickReplies ? 'quick-reply' : 'text',
          quickReplies: response.quickReplies
        };

        this.messages.update(messages => [...messages, botMessage]);

        // Update last message in current session
        this.updateSessionLastMessage(response.message);
      },
      error: (error) => {
        this.isSending.set(false);
        
        // Remove loading message
        this.messages.update(messages => 
          messages.filter(msg => !msg.isLoading)
        );

        // Show error message
        this.showError('Failed to send message. Please try again.');
        console.error('API Error:', error);

        // Add error message from bot
        const errorMessage: Message = {
          id: Date.now() + 2,
          content: 'Sorry, I encountered an error. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
        };

        this.messages.update(messages => [...messages, errorMessage]);
      }
    });
  }

 

  sendQuickReply(reply: string): void {
    this.newMessage = reply;
    this.sendMessage();
  }

  private updateSessionLastMessage(message: string): void {
    this.chatSessions.update(sessions =>
      sessions.map(session =>
        session.id === this.selectedSession() 
          ? { 
              ...session, 
              lastMessage: message.length > 50 ? message.substring(0, 50) + '...' : message,
              timestamp: new Date() 
            } 
          : session
      )
    );
  }

  selectSession(sessionId: number): void {
    this.selectedSession.set(sessionId);
    
    // Simulate loading different session messages
    this.messages.set([
      {
        id: 1,
        content: `Bienvenue dans la session de chat  ! Comment puis-je vous aider ?`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        quickReplies: ['Commencer', 'Poser une question', 'Besoin de support']
      }
    ]);

    // Mark as read
    this.chatSessions.update(sessions =>
      sessions.map(session =>
        session.id === sessionId ? { ...session, unread: false } : session
      )
    );
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update(open => !open);
  }

  clearChat(): void {
    this.messages.set([
      {
        id: 1,
        content: 'Chat cleared. How can I help you?',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        quickReplies: ['What can you do?', 'Tell me about features', 'Help with account']
      }
    ]);
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  private isMessageInCurrentSession(message: Message): boolean {
    // Simplified - in real app, you'd have session association
    return true;
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}