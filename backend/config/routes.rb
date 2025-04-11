Rails.application.routes.draw do
  # Authentication routes
  post "/login", to: "auth#login"
  post "/signup", to: "auth#signup"
  
  get 'educators/dashboard_data', to: 'educators#dashboard_data'
  get 'educators/enrolled_students', to: 'educators#get_enrolled_students_data'
  post 'educators/add_course', to: 'educators#add_course'

  # Routes for courses
  resources :courses, only: [:index, :show]

  # Routes for users
  get 'users/get_user_data', to: 'users#get_user_data'
  get 'users/enrolled_courses', to: 'users#get_enrolled_courses'
  
  # Updated Stripe payment routes
  post 'users/create_payment_intent', to: 'users#create_payment_intent'
  post 'users/complete_course_purchase', to: 'users#complete_course_purchase'
  # Keep the old route for backward compatibility
  post 'users/purchase_course', to: 'users#purchase_course'

  post 'users/update_course_progress', to: 'users#update_course_progress'
  get 'users/get_course_progress', to: 'users#get_course_progress'
  post 'users/add_rating', to: 'users#add_rating'
  post 'users/update_role', to: 'users#update_role'
  
  # Keep but might be unnecessary with new flow
  get '/success', to: 'users#verify_payment'
end