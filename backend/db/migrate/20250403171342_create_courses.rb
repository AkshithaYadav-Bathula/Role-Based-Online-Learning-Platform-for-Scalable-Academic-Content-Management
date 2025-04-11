class CreateCourses < ActiveRecord::Migration[7.2]
  def change
    create_table :courses, id: :uuid do |t|
      t.string :course_title, null: false
      t.text :course_description, null: false
      t.decimal :course_price, null: false, precision: 10, scale: 2
      t.boolean :is_published, default: true
      t.decimal :discount, null: false, default: 0, precision: 5, scale: 2
      t.uuid :educator_id, null: false

      t.timestamps
    end

   
    add_foreign_key :courses, :users, column: :educator_id, on_delete: :cascade
  end
end
