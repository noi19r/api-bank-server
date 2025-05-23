const { newError, uuidv4 } = require('../helpers/routerHelpers')
const Bank = require('../models/Bank')
const Deck = require('../models/Deck')
const Transaction = require('../models/Transaction')
const sendMailQueue = require('../config/bullConfig')
const newBank = async (req, res, next) => {
	const deck = req.deck
	const { _id } = req.user
	let { bank } = req.value.params
	let { username } = req.value.body
	if (await Bank.findOne({ bank: bank, username: username }))
		newError({
			status: 400,
			message: 'Tài khoản này đã tồn tại trong hệ thống.',
		})

	const newBank = new Bank({ bank: bank, username: username, owner: _id, token: uuidv4(), decks: deck._id })
	await newBank.save()
	// Add newly created bank to the actual banks

	await Deck.findByIdAndUpdate(deck._id, {
		banks: newBank._id,
	})
	return res.status(200).json({
		success: true,
		message: 'Bạn đã thêm tài khoản thành công.',
		data: {},
	})
}

const deleteBank = async (req, res, next) => {
	const { bankID } = req.value.params
	const { _id } = req.user
	const bank = await Bank.findOne({ _id: bankID, owner: _id })

	if (!bank)
		return res.status(400).json({
			success: false,
			error: {
				message: 'Tài khoản cần xoá không tồn tại. Vui lòng tải lại trang',
			},
			data: {},
		})
	await bank.remove()
	await Transaction.deleteMany({
		banks: bankID,
	})
	await Deck.findByIdAndUpdate(bank.decks, { $unset: { banks: 1 } })

	return res.status(200).json({
		success: true,
		message: 'Bạn đã xoá tài khoản thành công.',
		data: {},
	})
}

const updateBank = async (req, res, next) => {
	const { bankID } = req.value.params
	const { status } = req.value.body
	const bank = await Bank.findOne({ _id: bankID, owner: req.user._id })
	if (!bank)
		return res.status(400).json({
			success: false,
			error: {
				message: 'Tài khoản cần cập nhật không tồn tại. Vui lòng tải lại trang',
			},
			data: {},
		})
	const result = await Bank.findOneAndUpdate({ _id: bankID, owner: req.user._id }, { status })
	// Check if put user, remove bank in user's model
	return res.status(200).json({ success: Boolean(result), data: {} })
}

const listBank = async (req, res, next) => {
	const { _id: userID } = req.user
	const { bank } = req.value.params

	const accounts = await Bank.find(
		{
			owner: userID,
			bank,
		},
		{
			username: 1,
			phone: 1,
			balance: 1,
			status: 1,
			createdAt: 1,

			lastLogin: 1,
			newLogin: 1,
		}
	).populate({
		path: 'decks',
		select: {
			_id: 0,
			expired: 1,
		},
	})
	//const accounts = await await Bank.find({ owner: userID, bank },	{ username: 1, status: 1, createdAt: 1, bank: 1 }).limit(pageSize).skip(pageSize * (pageIndex - 1))

	return res.status(200).json({ success: true, data: { list: accounts, total: accounts.length } })
}
const lastTransactionBank = async (req, res, next) => {
	const { _id } = req.user

	let page = req.query.page * 1 || 1
	let limit = req.query.limit * 1 || 10
	let skip = limit * (page - 1)
	let last_page = 1
	const result = await Promise.allSettled([
		Transaction.find(
			{
				owner: _id,
				status: true,
			},
			{ io: 1, transId: 1, partnerId: 1, partnerName: 1, amount: 1, postBalance: 1, time: 1, comment: 1, _id: 0, info: 1, bank: 1 }
		)
			.limit(limit)
			.skip(skip)
			.sort({
				time: -1,
			}),
		Transaction.countDocuments({
			owner: _id,
			status: true,
		}),
	])
	const data = result[0].status === 'fulfilled' ? result[0].value : []
	const total = result[1].status === 'fulfilled' ? result[1].value : 0

	return res.status(200).json({ success: true, data, total, last_page })
}
const transactionBank = async (req, res, next) => {
	const { _id } = req.bank
	let last_page = 1
	let page = req.query.page * 1 || 1
	let limit = req.query.size * 1 || 5
	let skip = limit * (page - 1)
	let io = req.query.type
	let start = req.query.start || new Date(new Date().setMonth(new Date().getMonth() - 1)).getTime()
	let end = req.query.end || new Date().getTime()
	let dataFilter = {
		banks: _id,
		status: true,
		time: {
			$gte: start,
			$lte: end,
		},
	}
	if (io == 1 || io == -1) dataFilter.io = io

	const result = await Promise.allSettled([
		Transaction.find(dataFilter, { io: 1, transId: 1, partnerId: 1, partnerName: 1, amount: 1, postBalance: 1, time: 1, comment: 1, _id: 0, info: 1 })
			.limit(limit)
			.skip(skip)
			.sort({
				time: -1,
			}),
		Transaction.countDocuments(dataFilter),
	])
	const data = result[0].status === 'fulfilled' ? result[0].value : []
	const total = result[1].status === 'fulfilled' ? result[1].value : 0
	last_page = Math.ceil(total / limit)

	return res.status(200).json({ success: true, data, total, last_page })
}

const sendTokenToMail = async (req, res, next) => {
	const { bankID } = req.value.params
	const { _id, email } = req.user

	let bank = await Bank.findOne({
		_id: bankID,
		owner: _id,
	})
	if (!bank)
		newError({
			status: 400,
			message: 'Tài khoản không tồn tại trong hệ thống.',
		})
	else if (bank.status == 0)
		newError({
			status: 400,
			message: 'Tài khoản đang tạm thời ngưng sử dụng.',
		})
	else if (bank.status == 2)
		newError({
			status: 400,
			message: 'Tài khoản đang bị khoá vui lòng inbox admin giải quyết.',
		})
	else if (bank.status == 3)
		newError({
			status: 400,
			message: 'Vui lòng đang nhập lại tài khoản.',
		})
	else if (bank.status == 99)
		newError({
			status: 400,
			message: 'Tài khoản tạm thời chưa sử dụng được.',
		})

	let check = await Deck.findOne({
		expired: {
			$gt: new Date(),
		},
		banks: bank._id,
		owner: bank.owner,
	})

	if (!check)
		newError({
			status: 400,
			message: 'Tài khoản đã hết hạn sử dụng, vui lòng gia hạn để tiếp tục sử dụng.',
		})

	await sendMailQueue.add(
		{
			emailTo: email,
			subject: '[THUEAPI.NET] TOKEN sử dụng api, vui lòng không chia sẻ cho bất kì ai, hãy cẩn thận kẻ gian!!!',
			message: bank.token,
		},
		{
			removeOnComplete: true,
			removeOnFail: true,
			attempts: 3,
			timeout: 10000,
		}
	)

	return res.status(200).json({
		success: true,
		message: 'Vui lòng kiểm tra email của bạn.',
		data: {},
	})
}
module.exports = {
	deleteBank,
	newBank,
	updateBank,
	listBank,
	transactionBank,
	lastTransactionBank,
	sendTokenToMail,
}
