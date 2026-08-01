export interface NotionPageRaw {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: {
    Title?: { title?: { plain_text: string }[] };
    Name?: { title?: { plain_text: string }[] };
  };
}
