Rails.application.routes.draw do
  # Authentication routes
  post "/login", to: "auth#login"
  post "/signup", to: "auth#signup"
  
  get 'educators/dashboard_data', to: 'educators#dashboard_data'
  get 'educators/enrolled_students', to: 'educators#get_enrolled_students_data'
  post 'educators/add_course', to: 'educators#add_course'
  post 'educators/upload_resource_file', to: 'educators#upload_resource_file'
  get 'educators/courses/:id', to: 'educators#course_details'
  put 'educators/courses/:id', to: 'educators#update_course'
  delete 'educators/courses/:id', to: 'educators#delete_course'
  post 'educators/courses/:id/announcements', to: 'educators#create_announcement'
  get 'educators/courses/:id/announcements', to: 'educators#course_announcements'

  # Routes for courses
  resources :courses, only: [:index, :show]

  # Routes for users
  get 'users/get_user_data', to: 'users#get_user_data'
  get 'users/enrolled_courses', to: 'users#get_enrolled_courses'
  get 'users/announcements', to: 'users#get_announcements'
  get 'users/course_doubts', to: 'users#course_doubts'
  post 'users/course_doubts', to: 'users#create_course_doubt'
  post 'users/course_doubts/:id/upvote', to: 'users#toggle_course_doubt_upvote'
  
  # Updated Stripe payment routes
  post 'users/create_payment_intent', to: 'users#create_payment_intent'
  post 'users/complete_course_purchase', to: 'users#complete_course_purchase'
  # Keep the old route for backward compatibility
  post 'users/purchase_course', to: 'users#purchase_course'

  post 'users/update_course_progress', to: 'users#update_course_progress'
  get 'users/get_course_progress', to: 'users#get_course_progress'
  post 'users/add_rating', to: 'users#add_rating'
  post 'users/update_role', to: 'users#update_role'
  get 'users/notifications', to: 'users#notifications'
  post 'users/notifications/:id/read', to: 'users#mark_notification_read'
  post 'users/notifications/read_all', to: 'users#mark_all_notifications_read'

  get 'educators/courses/:id/doubts', to: 'educators#course_doubts'
  post 'educators/courses/:id/doubts/:doubt_id/reply', to: 'educators#reply_course_doubt'
  
  # Keep but might be unnecessary with new flow
  get '/success', to: 'users#verify_payment'
  post 'ai/chat', to: 'ai#chat'
  post 'ai/ingest', to: 'ai#ingest'
end