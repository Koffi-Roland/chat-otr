import { inject, Injectable, signal } from '@angular/core';
import { BotResponse } from './chatbot';
import { HttpClient } from '@angular/common/http';
import { delay, of } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ChatBotService {
  private http = inject(HttpClient);

  selectedSession = signal(1);

  // API configuration
  private readonly API_URL = 'http://localhost:3000/api/chat'; // Update with your API URL
  public sendMessageToBot(message: string) {
    const payload = {
      message: message,
      sessionId: this.selectedSession().toString(),
      timestamp: new Date().toISOString()
    };
   
     return this.http.post<BotResponse>(this.API_URL, payload);
  }
}
