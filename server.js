const express = require('express');
const app = express();

app.use(express.json());

// Your Make.com webhook URL
const MAKE_WEBHOOK_URL = 'https://hook.us1.make.com/your-webhook-id-here';

// Store caller info temporarily
const activeCalls = new Map();

app.post('/webhook/vapi', async (req, res) => {
  const { message } = req.body;
  
  // Capture caller ID when call starts
  if (message.type === 'call-start') {
    const callerPhone = message.call?.phoneNumber;
    const callId = message.call?.id;
    
    console.log('📞 Call started from:', callerPhone);
    
    // Store caller info for when call ends
    activeCalls.set(callId, {
      caller_id: callerPhone || 'Private',
      call_start: new Date().toISOString()
    });
  }
  
  // Send everything to Make.com when call ends
  if (message.type === 'call-end') {
    const callId = message.call?.id;
    const transcript = message.transcript || message.call?.transcript;
    const callerInfo = activeCalls.get(callId);
    
    console.log('📝 Sending to Make.com:', {
      caller: callerInfo?.caller_id,
      transcript: transcript ? 'Yes' : 'No'
    });
    
    // Send to Make.com
    try {
      const makeData = {
        caller_id: callerInfo?.caller_id || 'Unknown',
        transcript: transcript || 'No transcript available',
        call_id: callId,
        call_duration: callerInfo?.call_start ? 
          Math.round((new Date() - new Date(callerInfo.call_start)) / 1000) : 0,
        timestamp: new Date().toISOString()
      };
      
      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makeData)
      });
      
      if (response.ok) {
        console.log('✅ Data sent to Make.com successfully');
      } else {
        console.log('❌ Make.com webhook failed:', response.status);
      }
      
      // Clean up stored call info
      activeCalls.delete(callId);
      
    } catch (error) {
      console.error('❌ Error sending to Make.com:', error.message);
    }
  }
  
  res.status(200).send('OK');
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'VAPI → Make.com Bridge Running',
    active_calls: activeCalls.size 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 VAPI → Make.com bridge running on port ${PORT}`);
});
