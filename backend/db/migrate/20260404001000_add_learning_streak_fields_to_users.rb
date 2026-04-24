class AddLearningStreakFieldsToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :learning_streak, :integer, null: false, default: 0
    add_column :users, :last_learning_on, :date
    add_column :users, :streak_missed_notified_on, :date
  end
end
