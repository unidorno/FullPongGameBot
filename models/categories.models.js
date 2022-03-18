const mongoose = require('mongoose')
const Schema = mongoose.Schema

const CategorySchema = new Schema ({
    categories: {
        type: [{}],
        default: []
    }
})

mongoose.model('categories', CategorySchema)