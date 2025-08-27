import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createClient } from '@supabase/supabase-js'
import * as kv from './kv_store.tsx'

const app = new Hono()

// Configure CORS and logging
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))
app.use('*', logger(console.log))

// Create Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

// Helper function to verify user authentication
const verifyUser = async (accessToken: string) => {
  if (!accessToken) {
    console.log('verifyUser: No access token provided')
    return { error: 'No access token provided', status: 401 }
  }

  try {
    console.log('verifyUser: Attempting to verify token')
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (error) {
      console.log(`verifyUser: Auth error: ${error.message}`)
      return { error: `Authentication failed: ${error.message}`, status: 401 }
    }
    
    if (!user) {
      console.log('verifyUser: No user returned from auth')
      return { error: 'No user found', status: 401 }
    }

    console.log(`verifyUser: Successfully verified user ${user.id}`)
    return { user }
    
  } catch (verifyError) {
    console.log(`verifyUser: Unexpected error: ${verifyError}`)
    return { error: `Authentication verification failed: ${verifyError.message}`, status: 500 }
  }
}

// Initialize user credits and profile
const initializeUserProfile = async (userId: string, userData: any) => {
  try {
    console.log(`initializeUserProfile: Creating profile for user ${userId}`)
    
    const profile = {
      id: userId,
      ...userData,
      credits: 100, // Starting credits
      totalEarnings: 0,
      sessionsCompleted: 0,
      level: 1,
      experience: 0,
      streak: 0,
      weakSubjects: [],
      preferredLearningStyle: 'visual',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    }

    console.log('initializeUserProfile: Saving profile to KV store')
    await kv.set(`user_profile_${userId}`, profile)
    console.log('initializeUserProfile: Profile saved successfully')
    
    // Initialize user progress tracking
    console.log('initializeUserProfile: Saving progress data to KV store')
    await kv.set(`user_progress_${userId}`, {
      totalStudyTime: 0,
      completedQuizzes: 0,
      correctAnswers: 0,
      totalQuestions: 0,
      subjectProgress: {},
      dailyGoals: {
        studyTime: 60, // minutes
        questions: 10,
        completed: false
      },
      weeklyStats: {},
      monthlyStats: {}
    })
    console.log('initializeUserProfile: Progress data saved successfully')

    return profile
    
  } catch (initError) {
    console.log(`initializeUserProfile: Error: ${initError}`)
    throw new Error(`Failed to initialize user profile: ${initError.message}`)
  }
}

// Signup endpoint
app.post('/make-server-0e871cde/signup', async (c) => {
  // Endpoint to receive tutor session feedback and rating
  app.post('/make-server-0e871cde/session/feedback', async (c) => {
    try {
      const accessTokenRaw = c.req.header('Authorization');
      const accessToken = accessTokenRaw ? accessTokenRaw.replace('Bearer ', '') : '';
      const authResult = await verifyUser(accessToken);

      if (authResult.error) {
        return c.json({ error: authResult.error }, authResult.status as any || 401);
      }
      if (!authResult.user) {
        return c.json({ error: 'User not found.' }, 401);
      }

      const { sessionId, rating, feedback } = await c.req.json();
      if (!sessionId || !rating) {
        return c.json({ error: 'Session ID and rating are required.' }, 400);
      }

      // Store feedback in kv_store (keyed by session and user)
      const feedbackKey = `session_feedback_${sessionId}_${authResult.user.id}`;
      await kv.set(feedbackKey, {
        userId: authResult.user.id,
        sessionId,
        rating,
        feedback: feedback || '',
        timestamp: new Date().toISOString(),
      });

      return c.json({ message: 'Feedback submitted successfully.' });
    } catch (error) {
      console.log('Session feedback error:', error);
      return c.json({ error: 'Internal server error while submitting feedback.' }, 500);
    }
  });
  try {
    const { firstName, lastName, email, password, role } = await c.req.json()

    // Validate input
    if (!firstName || !lastName || !email || !password || !role) {
      return c.json({ error: 'All fields are required' }, 400)
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters long' }, 400)
    }

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        firstName, 
        lastName, 
        role 
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    })

    if (error) {
      console.log(`Signup error: ${error.message}`)
      return c.json({ error: error.message }, 400)
    }

    // Initialize user profile with credits and progress tracking
    const profile = await initializeUserProfile(data.user.id, {
      firstName,
      lastName,
      email,
      role
    })

    return c.json({ 
      message: 'User created successfully',
      user: profile
    })

  } catch (error) {
    console.log(`Signup error: ${error}`)
    return c.json({ error: 'Internal server error during signup' }, 500)
  }
})

// Get user profile endpoint
app.get('/make-server-0e871cde/profile', async (c) => {
  try {
    console.log('Profile endpoint called')
    
    const accessToken = c.req.header('Authorization')?.replace('Bearer ', '')
    console.log('Access token present:', !!accessToken)
    
    if (!accessToken) {
      console.log('No access token provided')
      return c.json({ error: 'No access token provided' }, 401)
    }
    
    const authResult = await verifyUser(accessToken ?? '')
    console.log('Auth result:', authResult.error ? `Error: ${authResult.error}` : 'Success')
    
    if (authResult.error) {
      return c.json({ error: authResult.error }, (authResult.status as any) || 401)
    }

    console.log(`Fetching profile for user: ${authResult.user?.id}`)
    
    // Get user profile from KV store
    let profile
    try {
      if (!authResult.user) {
        console.log('authResult.user is undefined')
        return c.json({ error: 'User information is missing from authentication result' }, 500)
      }
      profile = await kv.get(`user_profile_${authResult.user.id}`)
      console.log('Profile found in KV store:', !!profile)
    } catch (kvError) {
      console.log(`KV store error: ${kvError}`)
      throw new Error(`KV store error: ${kvError}`)
    }
    
    // If profile doesn't exist, create one from user metadata
    if (!profile) {
      if (!authResult.user) {
        console.log('Cannot create profile: authResult.user is undefined')
        return c.json({ error: 'User information is missing from authentication result' }, 500)
      }
      console.log(`Creating missing profile for user ${authResult.user.id}`)
      
      const userData = {
        firstName: authResult.user.user_metadata?.firstName || 'User',
        lastName: authResult.user.user_metadata?.lastName || '',
        email: authResult.user.email || '',
        role: authResult.user.user_metadata?.role || 'student'
      }
      
      console.log('User data for profile creation:', userData)
      
      try {
        profile = await initializeUserProfile(authResult.user.id, userData)
        console.log('Profile created successfully')
      } catch (initError) {
        console.log(`Profile initialization error: ${initError}`)
        throw new Error(`Profile initialization error: ${initError}`)
      }
    }

    // Update last active timestamp
    try {
      profile.lastActive = new Date().toISOString()
      if (authResult.user) {
        await kv.set(`user_profile_${authResult.user.id}`, profile)
        console.log('Profile updated with last active timestamp')
      } else {
        console.log('Profile update skipped: authResult.user is undefined')
      }
    } catch (updateError) {
      console.log(`Profile update error: ${updateError}`)
      // Don't fail the request if we can't update the timestamp
    }

    console.log('Returning profile successfully')
    return c.json({ user: profile })

  } catch (error) {
    console.log(`Profile fetch error: ${error}`)
    console.log(`Error stack: ${error.stack}`)
    return c.json({ 
      error: 'Internal server error while fetching profile',
      details: error.message,
      timestamp: new Date().toISOString()
    }, 500)
  }
})

// AI Tutor Chat endpoint
app.post('/make-server-0e871cde/ai-tutor/chat', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.replace('Bearer ', '')
    const authResult = await verifyUser(accessToken ?? '')
    
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status as any)
    }

    const { message, subject, difficulty, context } = await c.req.json()

    if (!message) {
      return c.json({ error: 'Message is required' }, 400)
    }

    // Get user profile to check credits
    if (!authResult.user) {
      return c.json({ error: 'User information is missing from authentication result' }, 500)
    }
    if (!authResult.user) {
      return c.json({ error: 'User information is missing from authentication result' }, 500)
    }
    const profile = await kv.get(`user_profile_${authResult.user?.id}`)
    if (!profile) {
      return c.json({ error: 'User profile not found' }, 404)
    }

    // Check if user has enough credits (1 credit per AI interaction)
    if (profile.credits < 1) {
      return c.json({ 
        error: 'Insufficient credits',
        suggestPurchase: true,
        currentCredits: profile.credits 
      }, 402)
    }

    // Prepare AI prompt based on tutoring context
    const systemPrompt = `You are an expert AI tutor specializing in ${subject || 'general academic subjects'}. 
    Your role is to help students understand concepts through:
    1. Step-by-step explanations
    2. Interactive questioning to gauge understanding
    3. Providing hints rather than direct answers when appropriate
    4. Encouraging critical thinking
    5. Adapting to the student's learning level

    Student level: ${difficulty || 'intermediate'}
    Context: ${context || 'General tutoring session'}

    If you encounter a question that is extremely complex or beyond typical tutoring scope, 
    respond with "COMPLEX_QUESTION_FLAG" at the start of your response so the system can offer human tutor matching.

    Keep responses concise but thorough, and always encourage the student.`

    // Call Gemini API
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY!
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nStudent Question: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    })

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json()
      console.log('Gemini API error:', errorData)
      return c.json({ error: 'AI service temporarily unavailable' }, 503)
    }

    const geminiData = await geminiResponse.json()
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I could not generate a response.'

    // Check if AI flagged this as a complex question
    const needsHumanTutor = aiResponse.startsWith('COMPLEX_QUESTION_FLAG')
    const cleanResponse = needsHumanTutor ? aiResponse.replace('COMPLEX_QUESTION_FLAG', '').trim() : aiResponse

    // Deduct 1 credit for AI interaction
    profile.credits -= 1
    profile.experience += 5 // Give some experience points
    await kv.set(`user_profile_${authResult.user.id}`, profile)

    // Save chat history
    const chatHistory = await kv.get(`chat_history_${authResult.user.id}`) || []
    chatHistory.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      userMessage: message,
      aiResponse: cleanResponse,
      subject,
      difficulty,
      creditsUsed: 1
    })
    
    // Keep only last 50 messages
    if (chatHistory.length > 50) {
      chatHistory.splice(0, chatHistory.length - 50)
    }
    
    await kv.set(`chat_history_${authResult.user.id}`, chatHistory)

    return c.json({
      response: cleanResponse,
      needsHumanTutor,
      creditsRemaining: profile.credits,
      experienceGained: 5
    })

  } catch (error) {
    console.log(`AI Tutor error: ${error}`)
    return c.json({ error: 'Internal server error during AI tutoring' }, 500)
  }
})

// Get chat history endpoint
app.get('/make-server-0e871cde/ai-tutor/history', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.replace('Bearer ', '')
    const authResult = await verifyUser(accessToken ?? '')
    
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status as any)
    }

    if (!authResult.user) {
      return c.json({ error: 'User information is missing from authentication result' }, 500)
    }
    const chatHistory = await kv.get(`chat_history_${authResult.user.id}`) || []

    return c.json({ history: chatHistory })

  } catch (error) {
    console.log(`Chat history error: ${error}`)
    return c.json({ error: 'Internal server error while fetching chat history' }, 500)
  }
})

// Purchase credits endpoint
app.post('/make-server-0e871cde/credits/purchase', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.replace('Bearer ', '')
    const authResult = await verifyUser(accessToken ?? '')
    
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status as any)
    }

    const { package: packageType } = await c.req.json()

    const packages = {
      basic: { credits: 20, price: 10, priceRM: 'RM10' },
      standard: { credits: 50, price: 20, priceRM: 'RM20' },
      premium: { credits: 100, price: 35, priceRM: 'RM35' },
      ultimate: { credits: 200, price: 60, priceRM: 'RM60' }
    }

    const selectedPackage = packages[packageType]
    if (!selectedPackage) {
      return c.json({ error: 'Invalid package type' }, 400)
    }

    // Get user profile
    if (!authResult.user) {
      return c.json({ error: 'User information is missing from authentication result' }, 500)
    }
    const profile = await kv.get(`user_profile_${authResult.user.id}`)
    if (!profile) {
      return c.json({ error: 'User profile not found' }, 404)
    }

    // In a real app, you would integrate with a payment gateway here
    // For demo purposes, we'll simulate a successful purchase
    profile.credits += selectedPackage.credits
    await kv.set(`user_profile_${authResult.user.id}`, profile)

    // Record purchase history
    if (!authResult.user) {
      return c.json({ error: 'User not found in authentication result' }, 500)
    }
    const purchaseHistory = await kv.get(`purchase_history_${authResult.user.id}`) || []
    purchaseHistory.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      package: packageType,
      credits: selectedPackage.credits,
      price: selectedPackage.priceRM,
      status: 'completed'
    })
    await kv.set(`purchase_history_${authResult.user.id}`, purchaseHistory)

    return c.json({
      message: 'Credits purchased successfully',
      creditsAdded: selectedPackage.credits,
      totalCredits: profile.credits,
      package: selectedPackage
    })

  } catch (error) {
    console.log(`Credit purchase error: ${error}`)
    return c.json({ error: 'Internal server error during credit purchase' }, 500)
  }
})

// Get daily motivation quote
app.get('/make-server-0e871cde/motivation/quote', async (c) => {
  try {
    const quotes = [
      { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
      { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
      { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
      { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
      { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
      { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" }
    ]

    const todayQuote = quotes[Math.floor(Math.random() * quotes.length)]

    return c.json({ quote: todayQuote })

  } catch (error) {
    console.log(`Motivation quote error: ${error}`)
    return c.json({ error: 'Internal server error while fetching quote' }, 500)
  }
})

// Health check endpoint
app.get('/make-server-0e871cde/health', async (c) => {
  try {
    // Test KV store connectivity
    const testKey = 'health_check_test'
    const testValue = { test: true, timestamp: new Date().toISOString() }
    await kv.set(testKey, testValue)
    const retrieved = await kv.get(testKey)
    
    // Clean up test data
    await kv.del(testKey)
    
    return c.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      kvStore: retrieved ? 'connected' : 'error',
      supabase: 'connected'
    })
  } catch (error) {
    console.log('Health check error:', error)
    return c.json({ 
      status: 'degraded', 
      timestamp: new Date().toISOString(),
      error: error.message,
      kvStore: 'error',
      supabase: 'unknown'
    }, 503)
  }
})

export default app.fetch