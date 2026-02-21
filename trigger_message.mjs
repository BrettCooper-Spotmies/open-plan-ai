import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function triggerMessage() {
  console.log("Triggering message...");
  // Login as sekharatece@gmail.com
  const { data: { user }, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'sekharatece@gmail.com',
    password: '1234567890'
  });
  if (authErr) {
    console.error("Auth Error:", authErr);
    process.exit(1);
  }

  // Get conversations for this user
  const { data: memberships } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', user.id);
  
  if (!memberships || memberships.length === 0) {
    console.log("No conversations found.");
    process.exit(0);
  }
  
  const convId = memberships[0].conversation_id;

  // Find another member in this conversation to act as sender 
  // (to trigger notification, sender must NOT be current user)
  const { data: convMembers } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', convId)
    .neq('user_id', user.id)
    .limit(1);

  let senderId = user.id; // fallback, won't trigger notif
  if (convMembers && convMembers.length > 0) {
    senderId = convMembers[0].user_id;
  } else {
    console.log("No other member found to send message as. Notification won't trigger.");
    process.exit(0);
  }

  // Insert a test message as the other user
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: convId,
      sender_id: senderId,
      content: 'This is a test notification message!',
      content_type: 'text'
    });
    
  if (error) {
    console.error("Error inserting message:", error);
  } else {
    console.log("Message inserted successfully!");
  }
}

triggerMessage();
