import type { CalendarMeeting } from "./calendar.types.js";

export class CalendarService {

  async getMeetings(): Promise<CalendarMeeting[]> {

    return [

      {

        id: "meet-01",

        title: "AI Security Review",

        organizer: "Security Team",

        start: "10:00",

        end: "11:00",

        aiRelated: true

      },

      {

        id: "meet-02",

        title: "GitHub Deployment",

        organizer: "DevOps",

        start: "15:00",

        end: "16:00",

        aiRelated: true

      }

    ];

  }

}