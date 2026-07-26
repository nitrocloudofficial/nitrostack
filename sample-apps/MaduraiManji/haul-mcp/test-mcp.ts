import 'dotenv/config';
import { CalendarTools } from './src/modules/calendar/calendar.tools.js';

async function testCalendar() {
  console.log('Testing the Google Calendar Tool manually...');
  
  const tools = new CalendarTools();
  
  try {
    const result = await tools.createCalendarEvent({
      summary: 'Coding submission',
      description: 'Submit hackathon project',
      startTime: new Date(new Date().setHours(new Date().getHours() + 1)).toISOString(),
      endTime: new Date(new Date().setHours(new Date().getHours() + 2)).toISOString()
    }, { logger: console } as any);
    
    console.log('\nResult from Google Calendar:');
    console.log(result);
    process.exit(0);
  } catch (error) {
    console.error('Failed to run calendar tool:', error);
    process.exit(1);
  }
}

testCalendar();
