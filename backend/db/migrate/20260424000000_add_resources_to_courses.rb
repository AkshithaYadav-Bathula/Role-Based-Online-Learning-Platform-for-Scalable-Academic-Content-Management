class AddResourcesToCourses < ActiveRecord::Migration[7.2]
  def change
    add_column :courses, :resources, :jsonb, null: false, default: []
  end
end