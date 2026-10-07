const User = require("../models/User");
const crypto = require("crypto");

const { hashPassword, comparePassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");

// OTP configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

// Generate a secure 6-digit OTP
function generateOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(OTP_LENGTH, "0");
}

// Hash OTP before storing in database
function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

// ============================================================
// BREVO EMAIL API
// ============================================================

function getBrevoConfig() {
  const apiKey = String(process.env.BREVO_API_KEY || "").trim();
  const fromEmail = String(process.env.BREVO_FROM_EMAIL || "").trim();
  const fromName = String(
    process.env.BREVO_FROM_NAME || "Styleverse"
  ).trim();

  if (!apiKey) {
    throw new Error(
      "Brevo email service is not configured. BREVO_API_KEY is missing."
    );
  }

  if (!fromEmail) {
    throw new Error(
      "Brevo email service is not configured. BREVO_FROM_EMAIL is missing."
    );
  }

  return {
    apiKey,
    fromEmail,
    fromName,
  };
}

async function sendBrevoEmail({
  to,
  subject,
  textContent,
  htmlContent,
}) {
  const {
    apiKey,
    fromEmail,
    fromName,
  } = getBrevoConfig();

  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",

      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },

      body: JSON.stringify({
        sender: {
          name: fromName,
          email: fromEmail,
        },

        to: [
          {
            email: to,
          },
        ],

        subject,
        textContent,
        htmlContent,
      }),
    }
  );

  if (!response.ok) {
    let details = "";

    try {
      const data = await response.json();

      details =
        data?.message ||
        data?.code ||
        JSON.stringify(data);
    } catch {
      try {
        details = await response.text();
      } catch {
        details = "";
      }
    }

    throw new Error(
      `Brevo email API failed (${response.status})${
        details ? `: ${details}` : ""
      }`
    );
  }

  try {
    return await response.json();
  } catch {
    return {};
  }
}

// ============================================================
// SEND VERIFICATION EMAIL
// ============================================================

async function sendVerificationEmail(email, otp) {
  await sendBrevoEmail({
    to: email,

    subject: "Styleverse Email Verification OTP",

    textContent:
      `Your Styleverse verification OTP is ${otp}. ` +
      `This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.`,

    htmlContent: `
      <div
        style="
          font-family:Arial,sans-serif;
          line-height:1.6;
          max-width:560px;
          margin:0 auto;
          padding:24px;
          color:#26211f;
        "
      >

        <h2 style="margin:0 0 12px">
          Styleverse Email Verification
        </h2>

        <p>
          Your Styleverse verification OTP is:
        </p>

        <div
          style="
            font-size:32px;
            font-weight:700;
            letter-spacing:8px;
            margin:20px 0;
          "
        >
          ${otp}
        </div>

        <p>
          This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.
        </p>

        <p
          style="
            color:#666;
            font-size:13px;
          "
        >
          If you did not request this code,
          you can ignore this email.
        </p>

      </div>
    `,
  });
}

// ============================================================
// SEND OTP
// POST /api/auth/send-otp
// ============================================================

exports.sendOtp = async (req, res, next) => {
  try {
    const email = String(
      req.body.email || ""
    )
      .toLowerCase()
      .trim();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email,
    }).select(
      "+emailVerificationOtpHash " +
        "+emailVerificationOtpExpiresAt " +
        "+emailVerificationOtpAttempts " +
        "+emailVerificationOtpLastSentAt"
    );

    if (!user) {
      // Don't reveal whether email exists
      return res.json({
        success: true,
        message:
          "If the account exists, an OTP has been sent",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // ========================================================
    // RESEND COOLDOWN
    // ========================================================

    if (user.emailVerificationOtpLastSentAt) {
      const elapsedSeconds =
        (Date.now() -
          user.emailVerificationOtpLastSentAt.getTime()) /
        1000;

      if (
        elapsedSeconds <
        OTP_RESEND_COOLDOWN_SECONDS
      ) {
        const retryAfter = Math.ceil(
          OTP_RESEND_COOLDOWN_SECONDS -
            elapsedSeconds
        );

        return res.status(429).json({
          success: false,
          message:
            `Please wait ${retryAfter} seconds ` +
            `before requesting another OTP`,
        });
      }
    }

    // ========================================================
    // GENERATE OTP
    // ========================================================

    const otp = generateOtp();

    const otpHash = hashOtp(otp);

    user.emailVerificationOtpHash = otpHash;

    user.emailVerificationOtpExpiresAt =
      new Date(
        Date.now() +
          OTP_EXPIRY_MINUTES *
            60 *
            1000
      );

    user.emailVerificationOtpAttempts = 0;

    user.emailVerificationOtpLastSentAt =
      new Date();

    await user.save();

    // ========================================================
    // SEND EMAIL USING BREVO
    // ========================================================

    try {
      await sendVerificationEmail(
        email,
        otp
      );
    } catch (mailError) {
      console.error(
        "Verification email send failed:",
        mailError.message
      );

      return res.status(503).json({
        success: false,
        message:
          "Could not send verification email. Please try again later.",
      });
    }

    return res.json({
      success: true,

      message:
        "OTP sent successfully",

      data: {
        expiresInMinutes:
          OTP_EXPIRY_MINUTES,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// SIGNUP
// POST /api/auth/signup
// ============================================================

exports.signup = async (
  req,
  res,
  next
) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    if (
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required",
      });
    }

    const normalizedEmail =
      String(email)
        .toLowerCase()
        .trim();

    // ========================================================
    // CHECK EXISTING USER
    // ========================================================

    const existing =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "Email already registered",
      });
    }

    // ========================================================
    // HASH PASSWORD
    // ========================================================

    const passwordHash =
      await hashPassword(
        String(password)
      );

    // ========================================================
    // CREATE USER
    // ========================================================

    const user =
      await User.create({
        name: String(name).trim(),
        email: normalizedEmail,
        passwordHash,
        isEmailVerified: false,
      });

    // ========================================================
    // GENERATE OTP
    // ========================================================

    const otp = generateOtp();

    const otpHash =
      hashOtp(otp);

    user.emailVerificationOtpHash =
      otpHash;

    user.emailVerificationOtpExpiresAt =
      new Date(
        Date.now() +
          OTP_EXPIRY_MINUTES *
            60 *
            1000
      );

    user.emailVerificationOtpAttempts =
      0;

    user.emailVerificationOtpLastSentAt =
      new Date();

    await user.save();

    // ========================================================
    // SEND OTP USING BREVO
    // ========================================================

    try {
      await sendVerificationEmail(
        normalizedEmail,
        otp
      );
    } catch (mailError) {
      console.error(
        "Signup verification email send failed:",
        mailError.message
      );

      // ======================================================
      // IMPORTANT:
      // Email failed, so remove the newly-created account.
      // This prevents the next attempt from returning
      // "Email already registered" for a failed signup.
      // ======================================================

      try {
        await User.deleteOne({
          _id: user._id,
        });
      } catch (cleanupError) {
        console.error(
          "Failed to cleanup unverified signup:",
          cleanupError.message
        );
      }

      return res.status(503).json({
        success: false,
        message:
          "Could not send verification email. Please try again.",
      });
    }

    // ========================================================
    // SUCCESS
    // ========================================================

    return res.status(201).json({
      success: true,

      message:
        "Signup successful. Please verify your email with the OTP.",

      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified:
            user.isEmailVerified,
        },

        requiresEmailVerification:
          true,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// VERIFY EMAIL OTP
// POST /api/auth/verify-otp
// ============================================================

exports.verifyOtp = async (
  req,
  res,
  next
) => {
  try {
    const email = String(
      req.body.email || ""
    )
      .toLowerCase()
      .trim();

    const otp = String(
      req.body.otp || ""
    ).trim();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Email and OTP are required",
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message:
          "OTP must be 6 digits",
      });
    }

    const user =
      await User.findOne({
        email,
      }).select(
        "+emailVerificationOtpHash " +
          "+emailVerificationOtpExpiresAt " +
          "+emailVerificationOtpAttempts"
      );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message:
          "Email is already verified",
      });
    }

    if (
      !user.emailVerificationOtpHash ||
      !user.emailVerificationOtpExpiresAt ||
      user.emailVerificationOtpExpiresAt <=
        new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "OTP is invalid or expired",
      });
    }

    if (
      (user.emailVerificationOtpAttempts || 0) >=
      MAX_OTP_ATTEMPTS
    ) {
      return res.status(429).json({
        success: false,
        message:
          "Too many incorrect OTP attempts. Please request a new OTP.",
      });
    }

    const providedHash =
      hashOtp(otp);

    const isMatch =
      crypto.timingSafeEqual(
        Buffer.from(
          providedHash,
          "utf8"
        ),
        Buffer.from(
          user.emailVerificationOtpHash,
          "utf8"
        )
      );

    if (!isMatch) {
      user.emailVerificationOtpAttempts =
        (user.emailVerificationOtpAttempts || 0) +
        1;

      await user.save();

      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
      });
    }

    // ========================================================
    // MARK EMAIL VERIFIED
    // ========================================================

    user.isEmailVerified =
      true;

    user.emailVerificationOtpHash =
      null;

    user.emailVerificationOtpExpiresAt =
      null;

    user.emailVerificationOtpAttempts =
      0;

    user.emailVerificationOtpLastSentAt =
      null;

    await user.save();

    // ========================================================
    // GENERATE JWT
    // ========================================================

    const token =
      generateToken(user);

    return res.json({
      success: true,

      message:
        "Email verified successfully",

      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified:
            user.isEmailVerified,
        },

        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// LOGIN
// POST /api/auth/login
// ============================================================

exports.login = async (
  req,
  res,
  next
) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail =
      String(email)
        .toLowerCase()
        .trim();

    const user =
      await User.findOne({
        email: normalizedEmail,
      }).select(
        "+passwordHash"
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked by admin",
      });
    }

    const isMatch =
      await comparePassword(
        String(password),
        user.passwordHash
      );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify your email before logging in",
      });
    }

    const token =
      generateToken(user);

    return res.json({
      success: true,

      message:
        "Login successful",

      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified:
            user.isEmailVerified,
        },

        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET CURRENT USER
// GET /api/auth/me
// ============================================================

exports.getMe = async (
  req,
  res,
  next
) => {
  try {
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );

    res.set(
      "Pragma",
      "no-cache"
    );

    res.set(
      "Expires",
      "0"
    );

    res.set(
      "Surrogate-Control",
      "no-store"
    );

    const user =
      await User.findById(
        req.user.userId
      ).select(
        "-passwordHash -resetPasswordToken -emailVerificationOtpHash"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    return res.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// UPDATE PROFILE
// PATCH /api/auth/me
// ============================================================

exports.updateProfile = async (
  req,
  res,
  next
) => {
  try {
    const {
      name,
    } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length < 2
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name must be at least 2 characters",
      });
    }

    const user =
      await User.findByIdAndUpdate(
        req.user.userId,

        {
          name: name.trim(),
        },

        {
          new: true,
          runValidators: true,
        }
      ).select(
        "-passwordHash -resetPasswordToken -emailVerificationOtpHash"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    return res.json({
      success: true,

      message:
        "Profile updated successfully",

      data: {
        user,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ============================================================

exports.forgotPassword = async (
  req,
  res,
  next
) => {
  try {
    const email = String(
      req.body.email || ""
    )
      .toLowerCase()
      .trim();

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email is required",
      });
    }

    const user =
      await User.findOne({
        email,
      }).select(
        "+resetPasswordToken +resetPasswordTokenExpires"
      );

    // Don't reveal whether account exists
    if (!user) {
      return res.json({
        success: true,
        message:
          "If the account exists, reset instructions have been sent",
      });
    }

    const rawToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    const hashedToken =
      crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    user.resetPasswordToken =
      hashedToken;

    user.resetPasswordTokenExpires =
      new Date(
        Date.now() +
          30 *
            60 *
            1000
      );

    await user.save();

    // TEMP DEVELOPMENT OUTPUT
    // Reset-link email service can be connected separately.
    console.log(
      `Password reset token generated for ${email}: ${rawToken}`
    );

    return res.json({
      success: true,

      message:
        "If the account exists, reset instructions have been sent",

      data: {
        expiresInMinutes: 30,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// RESET PASSWORD
// POST /api/auth/reset-password
// ============================================================

exports.resetPassword = async (
  req,
  res,
  next
) => {
  try {
    const {
      token,
      newPassword,
    } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message:
          "Token is required",
      });
    }

    if (
      !newPassword ||
      String(newPassword).length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 6 characters",
      });
    }

    const hashedToken =
      crypto
        .createHash("sha256")
        .update(String(token))
        .digest("hex");

    const user =
      await User.findOne({
        resetPasswordToken:
          hashedToken,

        resetPasswordTokenExpires: {
          $gt: new Date(),
        },
      }).select(
        "+resetPasswordToken +resetPasswordTokenExpires +passwordHash"
      );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired token",
      });
    }

    user.passwordHash =
      await hashPassword(
        String(newPassword)
      );

    // Clear reset token
    user.resetPasswordToken =
      null;

    user.resetPasswordTokenExpires =
      null;

    // Used by final JWT/session invalidation logic
    user.passwordChangedAt =
      new Date();

    await user.save();

    return res.json({
      success: true,
      message:
        "Password reset successfully",
    });
  } catch (err) {
    next(err);
  }
};