// controllers/userController.js
const User = require('../models/Users');
const bcrypt = require('bcryptjs')

// Update bank account details
exports.updateAccountDetails = async (req, res) => {
  try {
    const { bankName, accountNumber, accountName, bankCode } = req.body;

    if (!bankName || !accountNumber || !accountName || !bankCode) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        accountDetails: { bankName, accountNumber, accountName, bankCode },
      },
      { new: true }
    ).select('-passwordHash'); // Hide passwordHash in response

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Account details updated successfully',
      accountDetails: updatedUser.accountDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};



// Update bank account details
// exports.updateAccountDetails = async (req, res) => {
//   try {
//     const { bankName, accountNumber, accountName } = req.body;

//     if (!bankName || !accountNumber || !accountName) {
//       return res.status(400).json({ message: 'All fields are required' });
//     }

//     const updatedUser = await User.findByIdAndUpdate(
//       req.user.id,
//       {
//         accountDetails: { bankName, accountNumber, accountName},
//       },
//       { new: true }
//     ).select('-passwordHash'); // Hide passwordHash in response

//     if (!updatedUser) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     res.json({
//       message: 'Account details updated successfully',
//       accountDetails: updatedUser.accountDetails,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };




exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
