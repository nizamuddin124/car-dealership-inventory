from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl
from typing import Optional

class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    model_config = ConfigDict(from_attributes=True)

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class VehicleInput(BaseModel):
    make: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=60)
    price: float = Field(gt=0)
    quantity: int = Field(ge=0)
    year: Optional[int] = Field(default=None, ge=1886, le=2100)
    description: str = Field(default="", max_length=3000)
    image_url: str = Field(default="", max_length=1000)

class VehicleUpdate(BaseModel):
    make: Optional[str] = Field(default=None, min_length=1, max_length=80)
    model: Optional[str] = Field(default=None, min_length=1, max_length=100)
    category: Optional[str] = Field(default=None, min_length=1, max_length=60)
    price: Optional[float] = Field(default=None, gt=0)
    quantity: Optional[int] = Field(default=None, ge=0)
    year: Optional[int] = Field(default=None, ge=1886, le=2100)
    description: Optional[str] = Field(default=None, max_length=3000)
    image_url: Optional[str] = Field(default=None, max_length=1000)

class VehicleOut(BaseModel):
    id: int
    make: str
    model: str
    category: str
    price: float
    quantity: int
    year: Optional[int] = None
    description: str = ""
    image_url: str = ""
    model_config = ConfigDict(from_attributes=True)

class QuantityInput(BaseModel):
    quantity: int = Field(gt=0, le=10000)
